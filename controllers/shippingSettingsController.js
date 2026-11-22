import ShippingSettings from '../models/ShippingSettings.js';
import { getShippingSettings } from '../helpers/shippingPricing.js';

const respond = (res, status, success, data, message) =>
  res.status(status).json({ success, ...(data !== undefined ? { data } : {}), ...(message ? { message } : {}) });

export const readShippingSettings = async (req, res) => {
  try {
    const settings = await getShippingSettings();
    return respond(res, 200, true, {
      freeShippingMinimum: settings.freeShippingMinimum,
      standardShippingFee: settings.standardShippingFee,
    });
  } catch (error) {
    return respond(res, 500, false, undefined, error.message || 'Could not load shipping settings.');
  }
};

export const saveShippingSettings = async (req, res) => {
  const { freeShippingMinimum, standardShippingFee } = req.body || {};
  const values = [freeShippingMinimum, standardShippingFee];
  const hasInvalidAmount = values.some((value) => {
    const isNumericInput = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    return !isNumericInput || !Number.isFinite(Number(value)) || Number(value) < 0;
  });
  if (hasInvalidAmount) {
    return respond(res, 400, false, undefined, 'Free delivery minimum and shipping fee must be valid non-negative amounts.');
  }

  try {
    const settings = await ShippingSettings.findOneAndUpdate(
      { key: 'default' },
      {
        $set: {
          freeShippingMinimum: Number(freeShippingMinimum),
          standardShippingFee: Number(standardShippingFee),
        },
        $setOnInsert: { key: 'default' },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return respond(res, 200, true, {
      freeShippingMinimum: settings.freeShippingMinimum,
      standardShippingFee: settings.standardShippingFee,
    });
  } catch (error) {
    return respond(res, 400, false, undefined, error.message || 'Could not save shipping settings.');
  }
};
