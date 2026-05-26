import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { CreditCard, Truck, CheckCircle2 } from 'lucide-react';

interface CheckoutPageProps {
  onNavigate: (page: string) => void;
}

type LocationOption = {
  code: string;
  name: string;
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { cart, getCartTotal, clearCart } = useStore();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Shipping
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    houseNumber: '',
    streetName: '',
    building: '',
    region: '',
    regionCode: '',
    province: '',
    provinceCode: '',
    city: '',
    cityCode: '',
    barangay: '',
    barangayCode: '',
    postalCode: '',
    // Payment
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [regionOptions, setRegionOptions] = useState<LocationOption[]>([]);
  const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<LocationOption[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const formatPrice = (price: number) => `₱${price.toLocaleString()}`;
  const shippingCost = getCartTotal() >= 2000 ? 0 : 150;
  const total = getCartTotal() + shippingCost;

  const loadLocationOptions = async (
    level: 'regions' | 'provinces' | 'cities' | 'barangays',
    code?: string
  ) => {
    const params = new URLSearchParams({ level });
    if (code) {
      params.set('code', code);
    }

    const response = await fetch(`/api/locations?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${level}.`);
    }
    const data = await response.json();
    return (data.options ?? []) as LocationOption[];
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingLocations(true);
    loadLocationOptions('regions')
      .then((options) => {
        if (isMounted) {
          setRegionOptions(options);
        }
      })
      .catch((error) => {
        console.error(error);
        addToast('Unable to load regions.', { variant: 'error' });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLocations(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const handleRegionChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const regionCode = event.target.value;
    const regionName = event.target.selectedOptions[0]?.text ?? '';

    setFormData((prev) => ({
      ...prev,
      region: regionCode ? regionName : '',
      regionCode,
      province: '',
      provinceCode: '',
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
    }));

    setProvinceOptions([]);
    setCityOptions([]);
    setBarangayOptions([]);

    if (!regionCode) {
      return;
    }

    setIsLoadingLocations(true);
    try {
      const options = await loadLocationOptions('provinces', regionCode);
      setProvinceOptions(options);
    } catch (error) {
      console.error(error);
      addToast('Unable to load provinces.', { variant: 'error' });
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleProvinceChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const provinceCode = event.target.value;
    const provinceName = event.target.selectedOptions[0]?.text ?? '';

    setFormData((prev) => ({
      ...prev,
      province: provinceCode ? provinceName : '',
      provinceCode,
      city: '',
      cityCode: '',
      barangay: '',
      barangayCode: '',
    }));

    setCityOptions([]);
    setBarangayOptions([]);

    if (!provinceCode) {
      return;
    }

    setIsLoadingLocations(true);
    try {
      const options = await loadLocationOptions('cities', provinceCode);
      setCityOptions(options);
    } catch (error) {
      console.error(error);
      addToast('Unable to load cities.', { variant: 'error' });
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleCityChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const cityCode = event.target.value;
    const cityName = event.target.selectedOptions[0]?.text ?? '';

    setFormData((prev) => ({
      ...prev,
      city: cityCode ? cityName : '',
      cityCode,
      barangay: '',
      barangayCode: '',
    }));

    setBarangayOptions([]);

    if (!cityCode) {
      return;
    }

    setIsLoadingLocations(true);
    try {
      const options = await loadLocationOptions('barangays', cityCode);
      setBarangayOptions(options);
    } catch (error) {
      console.error(error);
      addToast('Unable to load barangays.', { variant: 'error' });
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleBarangayChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const barangayCode = event.target.value;
    const barangayName = event.target.selectedOptions[0]?.text ?? '';

    setFormData((prev) => ({
      ...prev,
      barangay: barangayCode ? barangayName : '',
      barangayCode,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);

    const requiredShippingFields = [
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.phone,
      formData.houseNumber,
      formData.streetName,
      formData.building,
      formData.regionCode,
      formData.provinceCode,
      formData.cityCode,
      formData.barangayCode,
      formData.postalCode,
    ];

    if (requiredShippingFields.some((value) => !value.trim())) {
      setSubmitError('Please complete the shipping information.');
      setCurrentStep(1);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
          },
          shipping: {
            houseNumber: formData.houseNumber,
            streetName: formData.streetName,
            building: formData.building,
            region: formData.region,
            province: formData.province,
            city: formData.city,
            barangay: formData.barangay,
            postalCode: formData.postalCode,
          },
          payment: {
            method: 'card',
            cardName: formData.cardName,
            cardNumber: formData.cardNumber,
          },
          items: cart.map((item) => ({
            productId: item.product.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmitError(data?.error ?? 'Unable to place your order right now.');
        addToast(data?.error ?? 'Checkout failed. Please try again.', {
          variant: 'error',
        });
        return;
      }

      setOrderNumber(data?.orderNumber ?? null);
      setCurrentStep(3);
      addToast('Order placed successfully.', { variant: 'success' });
      setTimeout(() => {
        clearCart();
      }, 2000);
    } catch (error) {
      console.error('Checkout failed.', error);
      setSubmitError('Unable to place your order right now.');
      addToast('Checkout failed. Please try again.', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0 && currentStep !== 3) {
    onNavigate('shop');
    return null;
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-[#E10613]" />
          <h2
            className="mb-4 tracking-[0.2em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            }}
          >
            ORDER CONFIRMED!
          </h2>
          {orderNumber && (
            <p className="mb-3 text-sm tracking-[0.2em] text-white/60">
              ORDER #{orderNumber}
            </p>
          )}
          <p className="text-white/70 mb-8 leading-relaxed">
            Thank you for your order. You will receive a confirmation email shortly with your order details and tracking information.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-8 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1
          className="mb-12 text-center tracking-[0.3em]"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          CHECKOUT
        </h1>

        {/* Progress Steps */}
        <div className="mb-12 flex justify-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${currentStep >= 1 ? 'border-white bg-white text-[#0B0B0C]' : 'border-white/30'
                  }`}
              >
                1
              </div>
              <span className="ml-2 tracking-[0.1em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                SHIPPING
              </span>
            </div>
            <div className="w-12 h-[2px] bg-white/30" />
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${currentStep >= 2 ? 'border-white bg-white text-[#0B0B0C]' : 'border-white/30'
                  }`}
              >
                2
              </div>
              <span className="ml-2 tracking-[0.1em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                PAYMENT
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form Section */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              {currentStep === 1 && (
                <div className="bg-[#121214] border border-white/10 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Truck className="w-6 h-6" />
                    <h2
                      className="tracking-[0.2em]"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      SHIPPING INFORMATION
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block mb-2">First Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">House No. *</label>
                      <input
                        type="text"
                        required
                        value={formData.houseNumber}
                        onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Street Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.streetName}
                        onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block mb-2">Building *</label>
                      <input
                        type="text"
                        required
                        placeholder="Apartment, unit, or floor"
                        value={formData.building}
                        onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Region *</label>
                      <select
                        required
                        value={formData.regionCode}
                        onChange={handleRegionChange}
                        disabled={isLoadingLocations && regionOptions.length === 0}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select region
                        </option>
                        {regionOptions.map((region, index) => (
                          <option key={`${region.code}-${index}`} value={region.code}>
                            {region.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2">Province *</label>
                      <select
                        required
                        value={formData.provinceCode}
                        onChange={handleProvinceChange}
                        disabled={!formData.regionCode || isLoadingLocations}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select province
                        </option>
                        {provinceOptions.map((province, index) => (
                          <option key={`${province.code}-${index}`} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2">City *</label>
                      <select
                        required
                        value={formData.cityCode}
                        onChange={handleCityChange}
                        disabled={!formData.provinceCode || isLoadingLocations}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select city
                        </option>
                        {cityOptions.map((city, index) => (
                          <option key={`${city.code}-${index}`} value={city.code}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2">Barangay *</label>
                      <select
                        required
                        value={formData.barangayCode}
                        onChange={handleBarangayChange}
                        disabled={!formData.cityCode || isLoadingLocations}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors disabled:opacity-60"
                      >
                        <option value="" disabled>
                          Select barangay
                        </option>
                        {barangayOptions.map((barangay, index) => (
                          <option key={`${barangay.code}-${index}`} value={barangay.code}>
                            {barangay.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2">Postal Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="mt-6 w-full py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    CONTINUE TO PAYMENT
                  </button>
                  {submitError && (
                    <p className="mt-4 text-sm text-[#E10613]">{submitError}</p>
                  )}
                </div>
              )}

              {/* Payment Information */}
              {currentStep === 2 && (
                <div className="bg-[#121214] border border-white/10 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-6 h-6" />
                    <h2
                      className="tracking-[0.2em]"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      PAYMENT INFORMATION
                    </h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block mb-2">Card Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block mb-2">Cardholder Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.cardName}
                        onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                        className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2">Expiry Date *</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                          className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block mb-2">CVV *</label>
                        <input
                          type="text"
                          required
                          placeholder="123"
                          value={formData.cvv}
                          onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                          className="w-full bg-[#0B0B0C] border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 py-4 border border-white/30 tracking-[0.2em] hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      BACK
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {isSubmitting ? 'PLACING ORDER...' : 'PLACE ORDER'}
                    </button>
                  </div>
                  {submitError && (
                    <p className="mt-4 text-sm text-[#E10613]">{submitError}</p>
                  )}
                </div>
              )}
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
                  {cart.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="w-16 h-20 bg-[#0B0B0C] border border-white/10">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate mb-1">{item.product.name}</p>
                        <p className="text-sm text-white/60">
                          {item.size} / {item.color}
                        </p>
                        <p className="text-sm text-white/60">Qty: {item.quantity}</p>
                      </div>
                      <div>{formatPrice(item.unitPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                  <div className="flex justify-between text-white/80">
                    <span>Subtotal</span>
                    <span>{formatPrice(getCartTotal())}</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="tracking-[0.15em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    TOTAL
                  </span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
