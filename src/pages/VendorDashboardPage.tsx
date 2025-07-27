import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ArrowLeft, Filter, ShoppingCart, LogOut, Clock, Package, MessageSquare, RefreshCw } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaymentModal from "@/components/PaymentModal";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  freshness: number;
  quantity: number;
  unit: string;
  is_available: boolean;
  supplier_id: string;
  supplier: {
    full_name: string;
    location: string;
    contact_number: string;
    preferred_languages: string[];
  };
}

interface Order {
  id: string;
  product_name: string;
  category: string;
  quantity_requested: number;
  total_amount: number;
  status: string;
  created_at: string;
  supplier_name: string;
}

const VendorDashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    console.log('Fetching products...');
    try {
      // First, fetch all available products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load products. Please try again.",
        });
        return;
      }

      console.log('Products fetched:', productsData?.length || 0);

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
        return;
      }

      // Get unique supplier IDs
      const supplierIds = [...new Set(productsData.map(p => p.supplier_id).filter(Boolean))];
      console.log('Supplier IDs to fetch:', supplierIds);

      // Fetch supplier profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, location, contact_number, preferred_languages')
        .in('id', supplierIds);

      if (profilesError) {
        console.error('Error fetching supplier profiles:', profilesError);
      }

      console.log('Profiles fetched:', profilesData?.length || 0);

      // Create a map of supplier_id to profile data
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Transform products with supplier info
      const transformedProducts = productsData.map(item => {
        const supplierProfile = profilesMap.get(item.supplier_id);
        console.log(`Product ${item.name} - Supplier ID: ${item.supplier_id}, Profile:`, supplierProfile);
        
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          freshness: item.freshness,
          quantity: item.quantity,
          unit: item.unit,
          is_available: item.is_available,
          supplier_id: item.supplier_id,
          supplier: {
            full_name: supplierProfile?.full_name || 'Unknown Supplier',
            location: supplierProfile?.location || 'Location not available',
            contact_number: supplierProfile?.contact_number || 'N/A',
            preferred_languages: supplierProfile?.preferred_languages || ['English']
          }
        };
      });

      console.log('Transformed products:', transformedProducts.length);
      setProducts(transformedProducts);
      setFilteredProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    console.log('Fetching orders for user:', user.id);
    try {
      // First, fetch all orders for this vendor
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return;
      }

      console.log('Orders fetched:', ordersData?.length || 0);

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Get unique product and supplier IDs
      const productIds = [...new Set(ordersData.map(o => o.product_id).filter(Boolean))];
      const supplierIds = [...new Set(ordersData.map(o => o.supplier_id).filter(Boolean))];

      // Fetch products and supplier profiles separately
      const [productsResponse, profilesResponse] = await Promise.all([
        supabase.from('products').select('id, name, category').in('id', productIds),
        supabase.from('profiles').select('id, full_name').in('id', supplierIds)
      ]);

      const productsMap = new Map();
      productsResponse.data?.forEach(product => {
        productsMap.set(product.id, product);
      });

      const profilesMap = new Map();
      profilesResponse.data?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Transform orders with product and supplier info
      const transformedOrders = ordersData.map(order => {
        const product = productsMap.get(order.product_id);
        const supplier = profilesMap.get(order.supplier_id);

        return {
          id: order.id,
          product_name: product?.name || 'Unknown Product',
          category: product?.category || 'Unknown',
          quantity_requested: order.quantity_requested,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          supplier_name: supplier?.full_name || 'Unknown Supplier'
        };
      });

      console.log('Transformed orders:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [user]);

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchProducts(), fetchOrders()]);
    setIsRefreshing(false);
    toast({
      title: "Refreshed!",
      description: "Data has been updated with the latest information.",
    });
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
    }
  }, [user, fetchProducts, fetchOrders]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscriptions...');

    // Subscribe to products changes
    const productsSubscription = supabase
      .channel('vendor-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('Products table changed:', payload);
          fetchProducts();
        }
      )
      .subscribe();

    // Subscribe to orders changes for this vendor
    const ordersSubscription = supabase
      .channel('vendor-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Orders table changed for vendor:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    // Subscribe to profiles changes (supplier info)
    const profilesSubscription = supabase
      .channel('vendor-profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profiles table changed:', payload);
          fetchProducts(); // Refresh products to get updated supplier info
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up subscriptions...');
      supabase.removeChannel(productsSubscription);
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(profilesSubscription);
    };
  }, [user, fetchProducts, fetchOrders]);

  const handleOrder = (product: Product) => {
    setSelectedProduct(product);
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (product: Product, quantity: number) => {
    if (!user || !profile) return;

    try {
      // First get supplier_id and current quantity from the product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('supplier_id, quantity')
        .eq('id', product.id)
        .single();

      if (productError) {
        console.error('Error fetching product data:', productError);
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: "Failed to fetch product information. Please try again.",
        });
        return;
      }

      // Check if there's enough quantity available
      if (productData.quantity < quantity) {
        toast({
          variant: "destructive",
          title: "Insufficient Stock",
          description: `Only ${productData.quantity} ${product.unit} available for ${product.name}.`,
        });
        return;
      }

      // Create the order and update product quantity in a transaction-like approach
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          vendor_id: user.id,
          product_id: product.id,
          supplier_id: productData.supplier_id,
          quantity_requested: quantity,
          total_amount: product.price * quantity,
          status: 'pending'
        });

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: "Failed to place order. Please try again.",
        });
        return;
      }

      // Update the product quantity by decrementing the ordered amount
      const newQuantity = productData.quantity - quantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          quantity: newQuantity,
          // If quantity reaches 0, mark as unavailable
          is_available: newQuantity > 0
        })
        .eq('id', product.id);

      if (updateError) {
        console.error('Error updating product quantity:', updateError);
        // Note: Order was already created, so we don't return here
        // The quantity update failed but the order exists
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Order placed but inventory may not have updated correctly.",
        });
      }

      // Refresh both orders and products to reflect changes
      fetchOrders();
      fetchProducts();
      
      toast({
        title: "Order Placed!",
        description: `Your order for ${quantity} ${product.unit} of ${product.name} has been sent to ${product.supplier.full_name}.`,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: "Failed to place order. Please try again.",
      });
    }
  };

  const handleInterested = (supplierName: string) => {
    toast({
      title: "Interest Registered!",
      description: `Your interest in ${supplierName} has been sent.`,
    });
  };

  const handleFeedback = (product: Product) => {
    setSelectedProduct(product);
    setShowFeedbackModal(true);
  };

  const applyFilters = () => {
    let filtered = products;

    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => 
        product.category.toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }

    if (priceFilter !== "all") {
      filtered = filtered.filter(product => {
        if (priceFilter === "low") return product.price < 50;
        if (priceFilter === "medium") return product.price >= 50 && product.price <= 150;
        if (priceFilter === "high") return product.price > 150;
        return true;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [categoryFilter, priceFilter, searchTerm, products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Vendor Dashboard</h1>
                <p className="text-sm text-muted-foreground">Find fresh supplies near you</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.full_name}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button 
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-4 w-4 mr-2" />
            Browse Products
          </Button>
          <Button 
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
          >
            <Clock className="h-4 w-4 mr-2" />
            My Orders
          </Button>
        </div>

        {activeTab === 'products' && (
          <>
            {/* Filters */}
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Search products or suppliers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="spices">Spices</SelectItem>
                      <SelectItem value="grains">Grains</SelectItem>
                      <SelectItem value="fruits">Fruits</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="low">Low (Under ₹50/kg)</SelectItem>
                      <SelectItem value="medium">Medium (₹50-150/kg)</SelectItem>
                      <SelectItem value="high">High (Above ₹150/kg)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={applyFilters} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-lg">{product.supplier.full_name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-sm font-medium">{(product.freshness / 20).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-1" />
                      {product.supplier.location}
                    </div>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {product.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-sm">{product.name}</span>
                          <span className="text-sm font-semibold">₹{product.price}/{product.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            <span className="text-xs text-muted-foreground">
                              {product.freshness}% fresh
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {product.quantity} {product.unit} available
                          </span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleOrder(product)}
                        className="ml-2"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Order
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleInterested(product.supplier.full_name)}
                      >
                        Show Interest
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleFeedback(product)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">No products found matching your criteria.</p>
                  <Button variant="outline" onClick={() => {
                    setCategoryFilter("all");
                    setPriceFilter("all");
                    setSearchTerm("");
                  }} className="mt-4">
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{order.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Supplier: {order.supplier_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{order.total_amount}</p>
                      <p className="text-sm text-muted-foreground">Qty: {order.quantity_requested}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{order.category}</Badge>
                      <Badge variant={
                        order.status === 'pending' ? 'destructive' : 
                        order.status === 'accepted' ? 'secondary' :
                        order.status === 'completed' ? 'default' : 'outline'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              
              {orders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet. Start ordering from suppliers to see them here.
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Payment Modal */}
        {selectedProduct && (
          <PaymentModal
            product={selectedProduct}
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedProduct(null);
            }}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {/* Feedback Modal */}
        {selectedProduct && user && (
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => {
              setShowFeedbackModal(false);
              setSelectedProduct(null);
            }}
            productId={selectedProduct.id}
            supplierId={selectedProduct.supplier_id}
            supplierName={selectedProduct.supplier.full_name}
            productName={selectedProduct.name}
            vendorId={user.id}
          />
        )}
      </div>
    </div>
  );
};

const VendorDashboard = () => {
  return (
    <ProtectedRoute requiredRole="vendor">
      <VendorDashboardContent />
    </ProtectedRoute>
  );
};

export default VendorDashboard;