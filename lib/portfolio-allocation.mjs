export function selectSpotAssets(assets) {
  return assets.filter((asset) => asset.account !== "futures");
}

export function selectExposureAssets(assets) {
  return assets;
}
