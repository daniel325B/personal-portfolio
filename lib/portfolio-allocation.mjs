export function selectSpotAssets(assets) {
  return assets.filter((asset) => asset.account !== "futures");
}
