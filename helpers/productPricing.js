export const calculateConfiguredUnitPrice = (product, configuration = {}) => {
  const productType = product.productType || 'eyeglasses';
  const basePrice = Number(product.offerPrice > 0 ? product.offerPrice : product.price) || 0;
  if (productType === 'contact-lens') {
    const boxes = Math.max(1, Number(configuration.contactLens?.boxes) || 1);
    const tier = product.contactLensConfig?.boxPricing?.find((entry) => Number(entry.boxes) === boxes);
    return tier ? Number(tier.price) : basePrice * boxes;
  }

  let additionalPrice = 0;
  if (productType === 'eyeglasses' && configuration.lensSelection?.lensType !== 'frame-only') {
    const lens = product.eyeglassesConfig?.availableLenses?.find((entry) => entry.id === configuration.lensSelection?.lensId);
    additionalPrice += Number(lens?.price) || 0;
  }
  if (productType === 'sunglasses') {
    const tint = product.sunglassesConfig?.lensTypes?.find((entry) => entry.id === configuration.sunglass?.lensType);
    additionalPrice += Number(tint?.price) || 0;
    if (configuration.sunglass?.mode === 'power') {
      const lens = product.eyeglassesConfig?.availableLenses?.find((entry) => entry.id === configuration.lensSelection?.lensId);
      additionalPrice += Number(lens?.price) || 0;
    }
  }
  return basePrice + additionalPrice;
};
