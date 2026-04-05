/**
 * exif-helper.js
 *
 * Robust GPS extraction from image EXIF metadata.
 *
 * ROOT CAUSE FIXED:
 * exif-parser's simplify.castDegreeValues() assumes GPSLatitude is always a
 * 3-element DMS array [deg, min, sec].  Modern Android phones (MediaTek,
 * Qualcomm) often write a single decimal-degree rational instead
 * (count=1, e.g. [[23177473, 1000000]]).  castDegreeValues treats that as a
 * scalar and tries to do scalar[0] + scalar[1]/60 … which yields NaN.
 *
 * FIX: disable exif-parser's simplifyValues so we receive raw
 * [[numerator, denominator], …] arrays, then convert them ourselves with a
 * format-agnostic rationalToDegrees() that handles:
 *   • count=1  → single decimal-degree rational   (modern phones)
 *   • count=3  → classic DMS rationals             (older / Canon / DSLR)
 *   • count=2  → deg + decimal-minutes (rare)
 */

const extractGPSFromImage = async (imageBuffer) => {
  try {
    const ExifParser = require("exif-parser");

    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length < 4) {
      return { lat: null, long: null, hasGPS: false };
    }

    // ── Parse without simplifyValues so we get raw rational arrays ──────────
    let result;
    try {
      const parser = ExifParser.create(imageBuffer);
      parser.enableSimpleValues(false); // ← key: get [[num,den],…] not scalars
      result = parser.parse();
    } catch (parseError) {
      console.warn("⚠️  EXIF parse error:", parseError.message);
      return { lat: null, long: null, hasGPS: false };
    }

    const tags = result.tags;
    if (!tags) return { lat: null, long: null, hasGPS: false };

    const rawLat  = tags.GPSLatitude;
    const rawLon  = tags.GPSLongitude;
    const latRef  = tags.GPSLatitudeRef;
    const lonRef  = tags.GPSLongitudeRef;

    // ── Nothing present ──────────────────────────────────────────────────────
    if (rawLat == null || rawLon == null) {
      return { lat: null, long: null, hasGPS: false };
    }

    // ── Convert a rational array (or scalar) to decimal degrees ─────────────
    const rationalToDegrees = (raw) => {
      // raw can be:
      //   [[num,den]]               — count=1  (modern decimal-degree)
      //   [[dN,dD],[mN,mD],[sN,sD]] — count=3  (classic DMS)
      //   [[dN,dD],[mN,mD]]         — count=2  (deg + decimal-minutes, rare)
      //   [num, den]                — already simplified to a single rational pair
      //   number                    — already a decimal (shouldn't happen here but safe)

      if (typeof raw === "number") return raw;           // scalar fallback

      // Flatten: if the first element is not an array it's a [num,den] pair
      const pairs = Array.isArray(raw[0]) ? raw : [raw];

      const toFloat = (pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return 0;
        const den = pair[1];
        if (den === 0) return 0;
        return pair[0] / den;
      };

      if (pairs.length === 1) {
        // count=1: already decimal degrees
        return toFloat(pairs[0]);
      } else if (pairs.length === 2) {
        // count=2: degrees + decimal minutes
        const deg = toFloat(pairs[0]);
        const min = toFloat(pairs[1]);
        return deg + min / 60;
      } else {
        // count=3: classic DMS
        const deg = toFloat(pairs[0]);
        const min = toFloat(pairs[1]);
        const sec = toFloat(pairs[2]);
        return deg + min / 60 + sec / 3600;
      }
    };

    let lat  = rationalToDegrees(rawLat);
    let long = rationalToDegrees(rawLon);

    // ── Apply hemisphere sign ────────────────────────────────────────────────
    // latRef / lonRef come back as a 1-element array of char-codes or a string
    const refString = (ref) => {
      if (typeof ref === "string") return ref.trim().toUpperCase();
      if (Array.isArray(ref) && ref.length > 0) {
        // raw char-codes: [[78,0]] for 'N', [[83,0]] for 'S', etc.
        const inner = Array.isArray(ref[0]) ? ref[0] : ref;
        return String.fromCharCode(inner[0]).toUpperCase();
      }
      return "";
    };

    const latHemi = refString(latRef);
    const lonHemi = refString(lonRef);

    if (latHemi === "S") lat  = -Math.abs(lat);
    if (lonHemi === "W") long = -Math.abs(long);

    // ── Sanity check ─────────────────────────────────────────────────────────
    if (isNaN(lat) || isNaN(long) || lat === 0 || long === 0) {
      console.warn("⚠️  GPS extracted but invalid after conversion:", { lat, long, rawLat, rawLon });
      return { lat: null, long: null, hasGPS: false };
    }

    if (lat < -90 || lat > 90 || long < -180 || long > 180) {
      console.warn("⚠️  GPS out of valid range:", { lat, long });
      return { lat: null, long: null, hasGPS: false };
    }

    console.log(`  ✅ GPS extracted: ${lat}, ${long} (${latHemi}/${lonHemi})`);
    return { lat, long, hasGPS: true };

  } catch (error) {
    console.warn("⚠️  EXIF extraction failed:", error.message);
    return { lat: null, long: null, hasGPS: false };
  }
};

module.exports = { extractGPSFromImage };