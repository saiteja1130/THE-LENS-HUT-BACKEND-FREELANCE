import ShippingSettings from '../models/ShippingSettings.js';

export const DEFAULT_SHIPPING_SETTINGS = Object.freeze({
  freeShippingMinimum: 999,
  standardShippingFee: 99,
});

export const getShippingSettings = async () => {
  const settings = await ShippingSettings.findOne({ key: 'default' }).lean();
  return {
    ...DEFAULT_SHIPPING_SETTINGS,
    ...(settings || {}),
  };
};

export const calculateShippingFee = (subtotal, settings = DEFAULT_SHIPPING_SETTINGS) => {
  const amount = Number(subtotal) || 0;
  if (amount <= 0 || amount >= Number(settings.freeShippingMinimum)) return 0;
  return Number(settings.standardShippingFee) || 0;
};
