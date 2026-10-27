import * as Location from 'expo-location';

/**
 * Automatically reverse-geocodes GPS coordinates into a clean, human-readable real-world street address.
 * Guarantees that raw latitude & longitude numbers are NEVER presented to users or admins.
 */
export async function getRealAddressFromCoords(latitude, longitude) {
    if (!latitude || !longitude) return 'Location unavailable';

    try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results && results.length > 0) {
            const item = results[0];
            const parts = [];

            if (item.name && item.name !== item.street && item.name !== item.city) {
                parts.push(item.name);
            }
            if (item.street) {
                parts.push(item.street);
            }
            if (item.district || item.subregion) {
                parts.push(item.district || item.subregion);
            }
            if (item.city) {
                parts.push(item.city);
            }
            if (item.region && item.region !== item.city) {
                parts.push(item.region);
            }
            if (item.postalCode) {
                parts.push(item.postalCode);
            }

            if (parts.length > 0) {
                return parts.join(', ');
            }
        }
    } catch (e) {
        console.warn('[ReverseGeocode] Device geocoding failed:', e);
    }

    // Fallback: Query backend reverse geocode proxy
    try {
        const response = await fetch(`https://logday-api.duckdns.org/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`);
        if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
                return data.display_name.split(',').slice(0, 4).join(', ');
            }
        }
    } catch (err) {
        console.warn('[ReverseGeocode] Backend proxy fallback failed:', err);
    }

    return `Area near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
}

/**
 * Acquires a high-accuracy fresh GPS position and resolves the real physical address automatically.
 */
export async function getCurrentRealLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Location permission is required to detect client site.');
    }

    const loc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('GPS Timeout')), 10000))
    ]);

    const realAddress = await getRealAddressFromCoords(loc.coords.latitude, loc.coords.longitude);

    return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        address: realAddress,
        isMocked: loc.mocked || false
    };
}
