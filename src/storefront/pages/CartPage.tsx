import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';

interface CartPageProps {
  onNavigate: (page: string, productId?: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {

  const { cart, removeFromCart, updateCartQuantity, getCartTotal, applyPromo, appliedPromo, removePromo, getDiscountAmount } = useStore();
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplying(true);
    await applyPromo(promoCode);
    setIsApplying(false);
    setPromoCode('');
  };

  const formatPrice = (price: number) => `₱${price.toLocaleString()}`;
  const subtotal = getCartTotal();
  const shippingCost = subtotal >= 2000 ? 0 : 150;
  const discount = getDiscountAmount();
  const total = subtotal + shippingCost - discount;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <ShoppingBag className="w-20 h-20 mx-auto mb-6 text-white/20" />
          <h2
            className="mb-4 tracking-[0.2em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            }}
          >
            YOUR CART IS EMPTY
          </h2>
          <p className="text-white/60 mb-8">Start shopping and add items to your cart.</p>
          <button
            onClick={() => onNavigate('shop')}
            className="px-8 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            SHOP NOW
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1
          className="mb-12 text-center tracking-[0.3em]"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          YOUR CART
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item, index) => (
              <div
                key={`${item.product.id}-${item.size}-${item.color}-${index}`}
                className="bg-[#121214] border border-white/10 p-6"
              >
                <div className="flex gap-6">
                  {/* Image */}
                  <button
                    onClick={() => onNavigate('product', item.product.id)}
                    className="w-32 h-40 bg-[#0B0B0C] border border-white/10 overflow-hidden flex-shrink-0"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </button>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <button
                          onClick={() => onNavigate('product', item.product.id)}
                          className="hover:underline mb-2"
                        >
                          <h3
                            className="tracking-[0.1em]"
                            style={{ fontFamily: "'Poppins', sans-serif" }}
                          >
                            {item.product.name}
                          </h3>
                        </button>
                        <p className="text-white/60 mb-1">Size: {item.size}</p>
                        <p className="text-white/60">Color: {item.color}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id, item.size, item.color)}
                        className="p-2 hover:bg-white/5 transition-colors"
                        aria-label="Remove item"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.product.id,
                              item.size,
                              item.color,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="w-8 h-8 border border-white/30 hover:border-white/60 transition-colors flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateCartQuantity(
                              item.product.id,
                              item.size,
                              item.color,
                              item.quantity + 1
                            )
                          }
                          className="w-8 h-8 border border-white/30 hover:border-white/60 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p>{formatPrice(item.unitPrice * item.quantity)}</p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-white/60">
                            {formatPrice(item.unitPrice)} each
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#121214] border border-white/10 p-6 sticky top-24">
              <h2
                className="mb-6 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                ORDER SUMMARY
              </h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-white/10">
                <div className="flex justify-between text-white/80">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-500">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                {subtotal < 2000 && (
                  <p className="text-sm text-white/60">
                    Spend {formatPrice(2000 - subtotal)} more for free shipping
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label
                  className="block mb-2 tracking-[0.15em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  PROMO CODE
                </label>
                {appliedPromo ? (
                  <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 px-4 py-3 rounded">
                    <span className="text-green-500 text-sm font-medium">{appliedPromo.code} Applied</span>
                    <button onClick={removePromo} className="text-xs text-white/60 hover:text-white">REMOVE</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={isApplying || !promoCode}
                      className="px-4 py-3 border border-white/30 hover:bg-white hover:text-[#0B0B0C] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white transition-all duration-300"
                    >
                      {isApplying ? "..." : "APPLY"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex justify-between">
                  <span className="tracking-[0.15em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    TOTAL
                  </span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('checkout')}
                className="w-full py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300 mb-3"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                PROCEED TO CHECKOUT
              </button>

              <button
                onClick={() => onNavigate('shop')}
                className="w-full py-4 border border-white/30 tracking-[0.2em] hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
