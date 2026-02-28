export const formatDistance = (distance, { compactDecimals = 1, maximumFractionDigits = 2 } = {}) => {
    if (distance >= 1000) {
        return `${(distance / 1000).toFixed(compactDecimals)}k`;
    }
    return distance.toLocaleString(undefined, { maximumFractionDigits });
};

export const formatVolume = (volume, { compactDecimals = 1 } = {}) => {
    if (volume >= 1000) {
        return `${(volume / 1000).toFixed(compactDecimals)}k`;
    }
    return volume.toLocaleString();
};
