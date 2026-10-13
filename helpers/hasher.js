/**
 * Deterministic Optical Engine Configuration Hasher (Backend)
 * Produces a stable, unique hash for any eyewear/optical configuration.
 * Distinct color variants and lens packages generate distinct hashes.
 */

export function generateConfigurationHash(productId, configuration = {}) {
  const colorName = (
    configuration.variantName ||
    configuration.frameColor ||
    configuration.selectedColor ||
    configuration.color ||
    ''
  ).toLowerCase().trim();

  const variantKey = (
    configuration.variantId ||
    (colorName ? `var-${colorName.replace(/\s+/g, '-')}` : 'default')
  ).toLowerCase().trim();

  const norm = {
    pid: String(productId || ''),
    pt: configuration.productType || '',
    v: variantKey,
    color: colorName,
    lt: configuration.lensSelection?.lensType || '',
    lid: configuration.lensSelection?.lensId || '',
    pm: configuration.prescription?.method || '',
    od: {
      sph: configuration.prescription?.od?.sph || '',
      cyl: configuration.prescription?.od?.cyl || '',
      axis: configuration.prescription?.od?.axis || '',
      add: configuration.prescription?.od?.add || '',
    },
    os: {
      sph: configuration.prescription?.os?.sph || '',
      cyl: configuration.prescription?.os?.cyl || '',
      axis: configuration.prescription?.os?.axis || '',
      add: configuration.prescription?.os?.add || '',
    },
    pd: configuration.prescription?.pd || '',
    rxFile: configuration.prescription?.fileId || configuration.prescription?.fileName || '',
    cl_boxes: configuration.contactLens?.boxes || 1,
    cl_pt: configuration.contactLens?.powerType || 'spherical',
    cl_od: {
      sph: configuration.contactLens?.od?.sph || '',
      cyl: configuration.contactLens?.od?.cyl || '',
      axis: configuration.contactLens?.od?.axis || '',
    },
    cl_os: {
      sph: configuration.contactLens?.os?.sph || '',
      cyl: configuration.contactLens?.os?.cyl || '',
      axis: configuration.contactLens?.os?.axis || '',
    },
    sg_mode: configuration.sunglass?.mode || 'standard',
    sg_lt: configuration.sunglass?.lensType || '',
  };

  const str = JSON.stringify(norm);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `cfg_${Math.abs(hash).toString(36)}_${norm.v}`;
}

export default generateConfigurationHash;
