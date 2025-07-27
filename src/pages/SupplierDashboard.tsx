import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, TrendingUp, Users, ArrowLeft, Edit, Trash2, LogOut, Clock, CheckCircle, CreditCard, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  freshness: number;
  quantity: number;
  is_available: boolean;
  image_url?: string;
}

interface Order {
  id: string;
  product_name: string;
  category: string;
  quantity_requested: number;
  total_amount: number;
  status: string;
  created_at: string;
  vendor_name: string;
  vendor_location: string;
}

const SupplierDashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedbacks, setFeedbacks] = useState<{
    id: string;
    message: string;
    rating: number;
    created_at: string;
    product_name?: string;
    vendor_name?: string;
  }[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'feedbacks'>('products');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', user.id);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          quantity_requested,
          total_amount,
          status,
          created_at,
          products (
            name,
            category
          ),
          vendor_profile:profiles!vendor_id (
            full_name,
            location
          )
        `)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      const transformedOrders = data?.map(order => ({
        id: order.id,
        product_name: order.products?.name || 'Unknown Product',
        category: order.products?.category || 'Unknown',
        quantity_requested: order.quantity_requested,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        vendor_name: order.vendor_profile?.full_name || 'Unknown Vendor',
        vendor_location: order.vendor_profile?.location || 'Location not provided'
      })) || [];

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update order status.",
        });
        return;
      }

      fetchOrders();
      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const fetchFeedbacks = async () => {
    if (!user) return;

    try {
      // First, get the profile ID for the current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        throw new Error('Could not verify your profile. Please complete your profile first.');
      }

      // Now fetch feedbacks where the current user is the supplier
      const { data, error } = await supabase
        .from('feedbacks')
        .select(`
          id,
          message,
          rating,
          created_at,
          product_id,
          vendor_id,
          products:product_id (name),
          vendor:vendor_id (full_name)
        `)
        .eq('supplier_id', profileData.id)  // Use the profile ID
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format
      const formattedFeedbacks = data.map(feedback => ({
        id: feedback.id,
        message: feedback.message,
        rating: feedback.rating,
        created_at: feedback.created_at,
        product_name: feedback.products?.name || 'Unknown Product',
        vendor_name: feedback.vendor?.full_name || 'Unknown Vendor'
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load feedbacks. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    // Fetch initial data
    fetchProducts();
    fetchOrders();
    fetchFeedbacks();

    // Set up real-time subscription for orders
    const ordersSubscription = supabase
      .channel('order_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `supplier_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New order received:', payload);
          // When a new order is created, update the product quantity
          const order = payload.new;
          if (order && order.product_id && order.quantity_requested) {
            updateProductQuantity(order.product_id, order.quantity_requested);
          }
          // Refresh orders list
          fetchOrders();
        }
      )
      .subscribe();

    // Set up real-time subscription for order status updates
    const orderUpdatesSubscription = supabase
      .channel('order_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `supplier_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order updated:', payload);
          // Refresh orders list
          fetchOrders();
        }
      )
      .subscribe();

    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(orderUpdatesSubscription);
    };
  }, [user]);

  // Function to update product quantity when an order is placed
  const updateProductQuantity = async (productId: string, quantityRequested: number) => {
    try {
      // Get current product quantity
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;
      if (!product) return;

      // Calculate new quantity (ensure it doesn't go below 0)
      const newQuantity = Math.max(0, product.quantity - quantityRequested);

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: newQuantity })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Update local state
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId ? { ...p, quantity: newQuantity } : p
        )
      );

      console.log(`Updated product ${productId} quantity to ${newQuantity}`);
    } catch (error) {
      console.error('Error updating product quantity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update product quantity. Please refresh the page.",
      });
    }
  };

  // Individual useEffect for each function to avoid dependency warnings
  const handleFetchProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('supplier_id', user.id);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setUploading(true);
    const formData = new FormData(e.currentTarget);
    
    let imageUrl = null;
    
    // Upload image if selected
    if (selectedImage) {
      try {
        // File validation
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

        if (!ALLOWED_TYPES.includes(selectedImage.type)) {
          toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please upload a JPEG, PNG, or WebP image",
          });
          setUploading(false);
          return;
        }

        if (selectedImage.size > MAX_FILE_SIZE) {
          toast({
            variant: "destructive",
            title: "File Too Large",
            description: "Maximum file size is 5MB",
          });
          setUploading(false);
          return;
        }

        const fileExt = selectedImage.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        // Upload the file
        const { data, error } = await supabase.storage
          .from('image')
          .upload(filePath, selectedImage, {
            cacheControl: '3600',
            upsert: false,
            contentType: selectedImage.type
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('image')
          .getPublicUrl(data.path);
        
        imageUrl = publicUrl;

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        });
        setUploading(false);
        return;
      }
    }
    
    // Proceed with product creation
    try {
      // Convert form data to proper types
      const price = Number(formData.get('price'));
      const freshness = Number(formData.get('freshness'));
      const quantity = Number(formData.get('quantity'));

      // Basic validation
      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid price');
      }
      if (isNaN(freshness) || freshness < 1 || freshness > 5) {
        throw new Error('Freshness must be between 1 and 5');
      }
      if (isNaN(quantity) || quantity < 0) {
        throw new Error('Please enter a valid quantity');
      }

      // Prepare the product data with user.id as supplier_id to match RLS policy
      const productData: any = {
        supplier_id: user.id, // Use user.id to match auth.uid() in RLS policy
        name: (formData.get('name') as string)?.trim(),
        category: (formData.get('category') as string)?.trim(),
        price: price,
        unit: (formData.get('unit') as string)?.trim(),
        freshness: freshness,
        quantity: Math.floor(quantity), // Ensure it's an integer
        is_available: true,
      };

      // Only add image_url if we have one and the column exists
      if (imageUrl) {
        productData.image_url = imageUrl;
      }

      console.log('Attempting to create product with data:', productData);

      // First try with the full data including image_url (if it exists)
      let { data, error } = await supabase
        .from('products')
        .insert([productData]) // Wrap in array as required by Supabase
        .select()
        .single();

      // If that fails with a column not found error, try without image_url
      if (error?.code === 'PGRST204' && error.message?.includes('image_url')) {
        console.log('Retrying without image_url column');
        delete productData.image_url;
        
        const retryResult = await supabase
          .from('products')
          .insert([productData]) // Wrap in array as required by Supabase
          .select()
          .single();
          
        if (retryResult.error) throw retryResult.error;
        data = retryResult.data;
      } else if (error) {
        throw error;
      }

      console.log('Product created successfully:', data);

      // Success
      setShowAddProduct(false);
      setSelectedImage(null);
      fetchProducts();
      
      toast({
        title: "Success!",
        description: "Product added successfully.",
      });
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add product. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
                <h1 className="text-2xl font-bold text-primary">Supplier Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your products and orders</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.full_name}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'pending').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.filter(o => o.status === 'completed').length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.total_amount), 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <Button 
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
          >
            <Package className="h-4 w-4 mr-2" />
            My Products ({products.length})
          </Button>
          <Button 
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
          >
            <Clock className="h-4 w-4 mr-2" />
            Incoming Orders ({orders.filter(o => o.status === 'pending').length})
          </Button>
          <Button 
            variant={activeTab === 'feedbacks' ? 'default' : 'outline'}
            onClick={() => setActiveTab('feedbacks')}
          >
            <Star className="h-4 w-4 mr-2" />
            Feedback ({feedbacks.length})
          </Button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Products</CardTitle>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="p-4 border rounded-lg">
                  <div className="flex gap-4 mb-2">
                    {product.image_url && (
                      <div className="flex-shrink-0">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ₹{product.price}/{product.unit}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{product.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {product.quantity} {product.unit} • {product.freshness}% fresh
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products yet. Add your first product to get started!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{order.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        From: {order.vendor_name} • {order.vendor_location}
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
                      <Badge variant={order.status === 'pending' ? 'destructive' : order.status === 'completed' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.id, 'accepted')}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateOrderStatus(order.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {order.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'completed')}
                      >
                        Mark Completed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {orders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No orders yet. Orders will appear here when vendors place them.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Product Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Product Image</Label>
                    <Input 
                      id="image" 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setSelectedImage(file || null);
                      }}
                      className="cursor-pointer"
                    />
                    {selectedImage && (
                      <div className="mt-2">
                        <img 
                          src={URL.createObjectURL(selectedImage)} 
                          alt="Preview" 
                          className="w-20 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vegetables">Vegetables</SelectItem>
                        <SelectItem value="Fruits">Fruits</SelectItem>
                        <SelectItem value="Grains">Grains</SelectItem>
                        <SelectItem value="Dairy">Dairy</SelectItem>
                        <SelectItem value="Spices">Spices</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input id="price" name="price" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Input id="unit" name="unit" placeholder="kg, liter, piece" required />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" step="0.01" required />
                    </div>
                    <div>
                      <Label htmlFor="freshness">Freshness (%)</Label>
                      <Input id="freshness" name="freshness" type="number" min="0" max="100" required />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1" disabled={uploading}>
                      {uploading ? 'Adding...' : 'Add Product'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowAddProduct(false);
                        setSelectedImage(null);
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'feedbacks' && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{feedback.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        From: {feedback.vendor_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          size={16}
                          className={star <= feedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                        />
                      ))}
                      <span className="text-sm ml-1">{feedback.rating}</span>
                    </div>
                  </div>
                  {feedback.message && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                      "{feedback.message}"
                    </p>
                  )}
                </div>
              ))}
              
              {feedbacks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No feedback received yet. Vendors will be able to leave feedback on your products.
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const SupplierDashboard = () => {
  return (
    <ProtectedRoute requiredRole="supplier">
      <SupplierDashboardContent />
    </ProtectedRoute>
  );
};

export default SupplierDashboard;