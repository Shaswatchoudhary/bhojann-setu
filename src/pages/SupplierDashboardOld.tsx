import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, TrendingUp, Users, Package, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  freshness: number;
  dateAdded: string;
}

interface Interest {
  id: string;
  vendorName: string;
  itemInterested: string;
  message: string;
  date: string;
  status: 'new' | 'contacted' | 'closed';
}

const SupplierDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [items, setItems] = useState<Item[]>([
    {
      id: "1",
      name: "Fresh Tomatoes",
      category: "vegetables",
      price: 40,
      unit: "kg",
      quantity: 50,
      freshness: 95,
      dateAdded: "2024-01-15"
    },
    {
      id: "2",
      name: "Basmati Rice",
      category: "grains",
      price: 80,
      unit: "kg",
      quantity: 100,
      freshness: 99,
      dateAdded: "2024-01-14"
    },
    {
      id: "3",
      name: "Fresh Milk",
      category: "dairy",
      price: 55,
      unit: "liter",
      quantity: 30,
      freshness: 98,
      dateAdded: "2024-01-16"
    }
  ]);

  const [interests] = useState<Interest[]>([
    {
      id: "1",
      vendorName: "Rajesh Street Food",
      itemInterested: "Fresh Tomatoes",
      message: "Need 10kg for daily use",
      date: "2024-01-16",
      status: 'new'
    },
    {
      id: "2",
      vendorName: "Mumbai Chaat Corner",
      itemInterested: "Basmati Rice", 
      message: "Looking for bulk supply",
      date: "2024-01-15",
      status: 'contacted'
    },
    {
      id: "3",
      vendorName: "Delhi Dosa Point",
      itemInterested: "Fresh Milk",
      message: "Daily requirement 5 liters",
      date: "2024-01-14",
      status: 'new'
    }
  ]);

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    price: "",
    unit: "",
    quantity: "",
    freshness: "95"
  });

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || !newItem.price || !newItem.unit || !newItem.quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const item: Item = {
      id: Date.now().toString(),
      name: newItem.name,
      category: newItem.category,
      price: parseFloat(newItem.price),
      unit: newItem.unit,
      quantity: parseInt(newItem.quantity),
      freshness: parseInt(newItem.freshness),
      dateAdded: new Date().toISOString().split('T')[0]
    };

    setItems([...items, item]);
    setNewItem({
      name: "",
      category: "",
      price: "",
      unit: "",
      quantity: "",
      freshness: "95"
    });

    toast({
      title: "Item Added!",
      description: `${item.name} has been added to your inventory.`,
    });
  };

  const getStatusBadge = (status: Interest['status']) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-primary">New</Badge>;
      case 'contacted':
        return <Badge variant="secondary">Contacted</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
    }
  };

  const totalRevenue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = items.length;
  const newInterests = interests.filter(i => i.status === 'new').length;

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
                <h1 className="text-2xl font-bold text-success">Supplier Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your inventory and buyer connections</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">
                +2 new this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Interests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newInterests}</div>
              <p className="text-xs text-muted-foreground">
                Pending responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.8</div>
              <p className="text-xs text-muted-foreground">
                From vendor reviews
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="inventory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="interests">Buyer Interests</TabsTrigger>
            <TabsTrigger value="add-item">Add New Item</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <CardDescription>
                      Added on {new Date(item.dateAdded).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <div className="font-semibold">₹{item.price}/{item.unit}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <div className="font-semibold">{item.quantity} {item.unit}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Freshness:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-sm font-medium">{item.freshness}%</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      Edit Item
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Buyer Interests Tab */}
          <TabsContent value="interests" className="space-y-6">
            <div className="space-y-4">
              {interests.map((interest) => (
                <Card key={interest.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{interest.vendorName}</CardTitle>
                        <CardDescription>
                          Interested in: {interest.itemInterested}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(interest.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(interest.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-3 rounded-lg mb-4">
                      <p className="text-sm">{interest.message}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        Contact Vendor
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Add New Item Tab */}
          <TabsContent value="add-item" className="space-y-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Item
                </CardTitle>
                <CardDescription>
                  Add fresh products to your inventory for vendors to discover
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g. Fresh Tomatoes"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={newItem.category} onValueChange={(value) => setNewItem({...newItem, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vegetables">Vegetables</SelectItem>
                        <SelectItem value="fruits">Fruits</SelectItem>
                        <SelectItem value="dairy">Dairy</SelectItem>
                        <SelectItem value="grains">Grains</SelectItem>
                        <SelectItem value="spices">Spices</SelectItem>
                        <SelectItem value="herbs">Herbs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select value={newItem.unit} onValueChange={(value) => setNewItem({...newItem, unit: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                        <SelectItem value="piece">Piece</SelectItem>
                        <SelectItem value="dozen">Dozen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freshness">Freshness Rating (%)</Label>
                  <Input
                    id="freshness"
                    type="number"
                    min="1"
                    max="100"
                    value={newItem.freshness}
                    onChange={(e) => setNewItem({...newItem, freshness: e.target.value})}
                  />
                </div>

                <Button onClick={handleAddItem} className="w-full" size="lg">
                  Add Item to Inventory
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SupplierDashboard;