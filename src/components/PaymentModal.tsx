import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, X, Wallet, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  supplier: {
    full_name: string;
    location: string;
  };
}

interface PaymentModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (product: Product, quantity: number) => void;
}

const PaymentModal = ({ product, isOpen, onClose, onPaymentComplete }: PaymentModalProps) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'cod'>('razorpay');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const totalAmount = product.price * quantity;

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      if (paymentMethod === 'razorpay') {
        // Simulating Razorpay payment
        toast({
          title: "Razorpay Integration",
          description: "Razorpay payment gateway would be integrated here. For demo purposes, payment is simulated.",
        });
        
        // Simulate payment success after 2 seconds
        setTimeout(() => {
          onPaymentComplete(product, quantity);
          toast({
            title: "Payment Successful!",
            description: `Payment of ₹${totalAmount} completed via Razorpay.`,
          });
          setIsProcessing(false);
          onClose();
        }, 2000);
        
      } else if (paymentMethod === 'upi') {
        if (!upiId) {
          toast({
            variant: "destructive",
            title: "UPI ID Required",
            description: "Please enter your UPI ID.",
          });
          setIsProcessing(false);
          return;
        }
        
        // Simulate UPI payment
        setTimeout(() => {
          onPaymentComplete(product, quantity);
          toast({
            title: "UPI Payment Successful!",
            description: `Payment of ₹${totalAmount} completed via UPI.`,
          });
          setIsProcessing(false);
          onClose();
        }, 2000);
        
      } else {
        // Cash on Delivery
        onPaymentComplete(product, quantity);
        toast({
          title: "Order Placed!",
          description: `Cash on Delivery order placed for ₹${totalAmount}.`,
        });
        setIsProcessing(false);
        onClose();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "Something went wrong. Please try again.",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Complete Payment</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Details */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-muted-foreground">
              From: {product.supplier.full_name}
            </p>
            <p className="text-sm text-muted-foreground">
              Price: ₹{product.price}/{product.unit}
            </p>
          </div>

          {/* Quantity Selection */}
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          {/* Payment Method Selection */}
          <div>
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={paymentMethod === 'razorpay' ? 'default' : 'outline'}
                className="h-16 flex-col"
                onClick={() => setPaymentMethod('razorpay')}
              >
                <CreditCard className="h-4 w-4 mb-1" />
                <span className="text-xs">Razorpay</span>
              </Button>
              <Button
                variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                className="h-16 flex-col"
                onClick={() => setPaymentMethod('upi')}
              >
                <QrCode className="h-4 w-4 mb-1" />
                <span className="text-xs">UPI</span>
              </Button>
              <Button
                variant={paymentMethod === 'cod' ? 'default' : 'outline'}
                className="h-16 flex-col"
                onClick={() => setPaymentMethod('cod')}
              >
                <Wallet className="h-4 w-4 mb-1" />
                <span className="text-xs">COD</span>
              </Button>
            </div>
          </div>

          {/* UPI ID Input */}
          {paymentMethod === 'upi' && (
            <div>
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="yourname@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          )}

          {/* Total Amount */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-lg font-bold">₹{totalAmount}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="text-sm text-muted-foreground">
            {paymentMethod === 'razorpay' && (
              <p>You'll be redirected to Razorpay to complete your payment securely.</p>
            )}
            {paymentMethod === 'upi' && (
              <p>Payment will be processed through UPI. Please ensure your UPI ID is correct.</p>
            )}
            {paymentMethod === 'cod' && (
              <p>You'll pay cash when the product is delivered to you.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handlePayment} 
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;