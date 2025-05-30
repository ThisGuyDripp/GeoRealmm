// InterceptCalculator.js

class InterceptCalculator {
    constructor() {
        this.config = window.CONFIG;
        this._cache = new Map();
        this._boundingBox = new THREE.Box3(); // Reusable bounding box
        this.SQRT3 = Math.sqrt(3);
    }

    /**
     * Calculates effective (scaled) unit axis lengths based on axial ratios.
     * @param {object} axialRatios - Object like { a_b: 1.0, c_b: 1.0 } or { c_a: 1.2 }
     * @param {string} system - Crystal system ('cubic', 'hexagonal', etc.)
     * @returns {object} - { a: scaled_a, b: scaled_b, c: scaled_c }
     * For hexagonal, 'a' refers to a1,a2,a3 length.
     */
    _getEffectiveUnitAxisLengths(axialRatios, system) {
        const baseRefLength = this.config.AXIS.LENGTH; // e.g., 2.0
        let eff_a, eff_b, eff_c;

        if (system === 'cubic') {
            // By convention for a/b, c/b ratios, b is the reference.
            eff_b = baseRefLength;
            eff_a = eff_b * (axialRatios.a_b || 1.0); // Visual Z for 'a'
            eff_c = eff_b * (axialRatios.c_b || 1.0); // Visual Y for 'c'
        } else if (system === 'hexagonal') {
            // By convention for c/a ratio, a is the reference.
            eff_a = baseRefLength; // This is for a1, a2, a3
            eff_c = eff_a * (axialRatios.c_a || 1.0); // Visual Y for 'c'
            eff_b = baseRefLength; // b-axis isn't primary but give it a length
        }
        // Add other systems here:
        // else if (system === 'tetragonal') { eff_a = baseRefLength; eff_b = eff_a; eff_c = eff_a * (axialRatios.c_a || 1.0); }
        // else if (system === 'orthorhombic') { eff_b = baseRefLength; eff_a = eff_b * (axialRatios.a_b || 1.0); eff_c = eff_b * (axialRatios.c_b || 1.0); }
        else { // Default fallback if system or ratios are not perfectly defined
            eff_a = baseRefLength;
            eff_b = baseRefLength;
            eff_c = baseRefLength;
        }
        return { a: eff_a, b: eff_b, c: eff_c };
    }


    calculateIntercepts(params) {
        try {
            const { system, axialRatios } = params;
            const cacheKey = this._getCacheKey(params);
            if (this._cache.has(cacheKey)) {
                CONFIG_UTILS.debug('InterceptCalculator: Using cached result for', 'info', params);
                return this._cache.get(cacheKey);
            }

            if (!this.validateIndices(params)) { // Validation should be robust
                throw new Error('Invalid Miller indices for the selected system.');
            }

            // Get effective unit axis lengths based on axial ratios
            // These are the lengths that 1 unit on each axis corresponds to in the 3D scene.
            const effLengths = this._getEffectiveUnitAxisLengths(axialRatios, system);
            CONFIG_UTILS.debug('Effective unit axis lengths:', 'info', effLengths);


            let result;
            if (system === 'cubic') {
                result = this._calculateCubicIntercepts(params, effLengths);
            } else if (system === 'hexagonal') {
                result = this._calculateHexagonalIntercepts(params, effLengths);
            } else {
                throw new Error(`Unsupported crystal system: ${system}`);
            }

            this._cache.set(cacheKey, result);
            return result;

        } catch (error) {
            CONFIG_UTILS.debug(`Intercept calculation error: ${error.message}`, 'error', error);
            throw error;
        }
    }

    _calculateCubicIntercepts(params, effLengths) {
        const { h, k, l, system, axialRatios } = params;

        // Weiss parameters (multiples of unit axes)
        const weiss_a = this._calculateSingleWeissParameter(h); // for a-axis (visual Z)
        const weiss_b = this._calculateSingleWeissParameter(k); // for b-axis (visual X)
        const weiss_c = this._calculateSingleWeissParameter(l); // for c-axis (visual Y)

        // Actual intercept coordinates = Weiss parameter * effective unit length of that axis
        const coord_a = weiss_a === Infinity ? Infinity : weiss_a * effLengths.a;
        const coord_b = weiss_b === Infinity ? Infinity : weiss_b * effLengths.b;
        const coord_c = weiss_c === Infinity ? Infinity : weiss_c * effLengths.c;

        const intersections = {
            // In our visual system: a-axis is Z, b-axis is X, c-axis is Y
            x: coord_b === Infinity ? null : new THREE.Vector3(coord_b, 0, 0), // Intercept on b-axis
            y: coord_c === Infinity ? null : new THREE.Vector3(0, coord_c, 0), // Intercept on c-axis
            z: coord_a === Infinity ? null : new THREE.Vector3(0, 0, coord_a)  // Intercept on a-axis
        };

        // Normal calculation is based on Miller indices, independent of scaling.
        const normal = this._calculateCubicPlaneNormal(h, k, l); // h (a-axis/Z), k (b-axis/X), l (c-axis/Y)
        const center = this._calculatePlaneCenter(Object.values(intersections));
        const size = this._calculatePlaneSize(Object.values(intersections), Math.max(effLengths.a, effLengths.b, effLengths.c));


        return {
            intersections,
            normal,
            center,
            size,
            parameters: { h, k, l, system, axialRatios }, // Pass axialRatios through
            // Store Weiss parameters (reciprocals), not scaled coordinates, for solution steps
            weissParameters: { a: weiss_a, b: weiss_b, c: weiss_c }
        };
    }

     _calculateCubicPlaneNormal(h_for_a, k_for_b, l_for_c) {
        // Normal vector components are proportional to Miller indices in the visual coordinate system.
        // Visual: a-axis (Z), b-axis (X), c-axis (Y)
        // Miller: h (a-axis), k (b-axis), l (c-axis)
        // So, normal vector in (X, Y, Z) is (k, l, h)
        const normal = new THREE.Vector3(k_for_b, l_for_c, h_for_a);
        if (normal.lengthSq() === 0) {
            CONFIG_UTILS.debug('Cannot calculate normal for zero vector (cubic)', 'warn');
            return new THREE.Vector3(0, 0, 1); // Default normal
        }
        return normal.normalize();
    }


    _calculateHexagonalIntercepts(params, effLengths) {
         const { h, k, i, l, system, axialRatios } = params;

         const weiss_a1 = this._calculateSingleWeissParameter(h);
         const weiss_a2 = this._calculateSingleWeissParameter(k);
         const weiss_a3 = this._calculateSingleWeissParameter(i);
         const weiss_c  = this._calculateSingleWeissParameter(l);

         // effLengths.a is for a1, a2, a3 axes. effLengths.c is for c-axis.
         const coord_a1 = weiss_a1 === Infinity ? Infinity : weiss_a1 * effLengths.a;
         const coord_a2 = weiss_a2 === Infinity ? Infinity : weiss_a2 * effLengths.a;
         const coord_a3 = weiss_a3 === Infinity ? Infinity : weiss_a3 * effLengths.a;
         const coord_c  = weiss_c  === Infinity ? Infinity : weiss_c  * effLengths.c;

        // Hexagonal axes orientation in visual coordinates (c along Y, a1,a2,a3 in XZ plane)
        // a1 along +X visual
        // a2 at 120 deg from a1 (in XZ plane: x = val * cos(120), z = val * sin(120))
        //    cos(120) = -0.5, sin(120) = sqrt(3)/2
        // a3 at 240 deg from a1 (in XZ plane: x = val * cos(240), z = val * sin(240))
        //    cos(240) = -0.5, sin(240) = -sqrt(3)/2
         const intersections = {
             a1: coord_a1 === Infinity ? null : new THREE.Vector3(coord_a1, 0, 0),
             a2: coord_a2 === Infinity ? null : new THREE.Vector3(coord_a2 * -0.5, 0, coord_a2 * (this.SQRT3 / 2)),
             a3: coord_a3 === Infinity ? null : new THREE.Vector3(coord_a3 * -0.5, 0, coord_a3 * (-this.SQRT3 / 2)),
             c:  coord_c  === Infinity ? null : new THREE.Vector3(0, coord_c, 0) // c-axis is along visual Y
         };
         
         // ---- START OF FIX ----
         // Pass effLengths to _calculateHexagonalPlaneNormal
         const normal = this._calculateHexagonalPlaneNormal(h, k, l, axialRatios.c_a || 1.0, effLengths);
         // ---- END OF FIX ----
         
         const center = this._calculatePlaneCenter(Object.values(intersections));
         const size = this._calculatePlaneSize(Object.values(intersections), Math.max(effLengths.a, effLengths.c));

         return {
            intersections,
            normal,
            center,
            size,
            parameters: { h, k, i, l, system, axialRatios },
            weissParameters: { a1: weiss_a1, a2: weiss_a2, a3: weiss_a3, c: weiss_c }
         };
    }

    // ---- START OF FIX ----
    // Modified signature to accept effLengths
    _calculateHexagonalPlaneNormal(h, k, l, c_a_ratio, effLengths) { 
    // ---- END OF FIX ----
        // Normal vector (h, k, l) in reciprocal space.
        // Transform to direct space considering c/a ratio for non-isometric c-axis.
        // Components in a Cartesian system aligned with a1, a2 (at 120), c:
        // x component: h - k/2 (since a3 = -(a1+a2) and i = -(h+k))
        // y component: (k * sqrt(3))/2
        // z component: l / (c/a ratio of unit cell)
        // This (x,y,z) is in a coordinate system where a1 is along x, a2 is at 120 deg to x in xy plane, and c is along z.

        // In our visual system (c is Y, a-axes in XZ):
        // Normal_visual_X = h - k/2
        // Normal_visual_Z = k * sqrt(3)/2
        // Normal_visual_Y = l / c_a_ratio_eff (where c_a_ratio_eff takes into account effective lengths)

        const nx_hex = h - k/2; // Effectively component along a1 + projection of a2 on a1
        const nz_hex = k * this.SQRT3 / 2; // Component perpendicular to a1 in the basal plane (visual XZ)
        
        // The 'l' component of the normal needs to be scaled relative to the 'a' components
        // if the c/a ratio of the unit cell is not 1.
        // The normal vector components are inversely proportional to the intercepts on the real space axes.
        // If c-axis is stretched (c/a > 1), its reciprocal lattice vector is compressed.
        // A common formula for normal components in Cartesian (a1 along x, a2 at 120, c along z):
        // Nx ~ h - k/2
        // Ny ~ k * sqrt(3)/2
        // Nz ~ l / (c_crystal / a_crystal)
        // Mapping to our visual system (a1 visual X, c visual Y, a2/a3 in XZ):
        // Visual X component ~ h - k/2
        // Visual Z component ~ k * sqrt(3)/2
        // Visual Y component ~ l / (effLengths.c / effLengths.a)
        //                     ~ l * (effLengths.a / effLengths.c)
        
        let ny_hex;
        if (effLengths && effLengths.c !== 0 && effLengths.a !== undefined) { // Check effLengths and properties
            ny_hex = l * (effLengths.a / effLengths.c);
        } else {
            // Fallback if effLengths is not available or c is zero (should not happen for valid cell)
            // Use the direct c_a_ratio from parameters, which is c_crystal/a_crystal
            ny_hex = l / c_a_ratio; 
            CONFIG_UTILS.debug('_calculateHexagonalPlaneNormal: effLengths not fully available, using direct c_a_ratio for l-component scaling.', 'warn', {c_a_ratio, effLengths});
        }

        const normVec = new THREE.Vector3(nx_hex, ny_hex, nz_hex);

         if (normVec.lengthSq() < 1e-10) { // Check for zero vector
             // Special case for basal plane (000l)
             if (h === 0 && k === 0 && (-(h+k)) === 0 && l !== 0) { // i is -(h+k)
                 return new THREE.Vector3(0, Math.sign(l), 0); // Normal along c-axis (visual Y)
             }
             CONFIG_UTILS.debug('Cannot calculate normal for zero vector (hexagonal). Indices:', 'warn', {h,k,l});
             return new THREE.Vector3(0, 1, 0); // Default normal (e.g., positive c-axis)
         }
         return normVec.normalize();
     }

    _calculateSingleWeissParameter(index) { // Renamed from _calculateSingleIntercept
        const numIndex = Number(index);
        if (!Number.isFinite(numIndex) || Math.abs(numIndex) < 1e-10) { // Treat 0 index as infinity
             return Infinity;
        }
        return 1 / numIndex;
    }

    _calculatePlaneCenter(intersectionPointsList) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length === 0) {
            CONFIG_UTILS.debug('No valid intersection points for center calculation', 'warn');
            return new THREE.Vector3(0, 0, 0);
        }
        const center = new THREE.Vector3();
        validPoints.forEach(point => center.add(point));
        center.divideScalar(validPoints.length);
        return center;
    }

    _calculatePlaneSize(intersectionPointsList, maxEffLength) {
        const validPoints = intersectionPointsList.filter(p => p instanceof THREE.Vector3);
        if (validPoints.length <= 1) { // If plane is parallel to two axes or defined by one point
             return Math.max(this.config.PLANE.DEFAULT_SIZE, maxEffLength * 1.5); // Default size related to max axis length
        }
        this._boundingBox.makeEmpty();
        // Include origin in bounding box to ensure size is reasonable if all intercepts are far out
        this._boundingBox.expandByPoint(new THREE.Vector3(0,0,0));
        validPoints.forEach(point => this._boundingBox.expandByPoint(point));

        const sizeVec = new THREE.Vector3();
        this._boundingBox.getSize(sizeVec);
        const maxDimension = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);

        // Ensure plane size is at least a bit larger than the unit cell dimensions
        const calculatedSize = Math.max(maxDimension, maxEffLength * 0.5) * 1.5; // Multiplier for visual padding
        return Math.min(calculatedSize, this.config.PLANE.MAX_SIZE); // Cap max size
    }

    validateIndices(params) {
        const { system } = params;
        try {
            if (system === 'cubic') {
                const { h, k, l } = params;
                const indices = [h, k, l].map(Number);
                if (indices.every(val => val === 0)) throw new Error('All indices cannot be zero for cubic.');
                if (indices.some(val => !Number.isInteger(val))) throw new Error('Cubic indices must be integers.');
                if (indices.some(val => !Number.isFinite(val))) throw new Error('Invalid cubic index value (NaN or Infinity).');
            } else if (system === 'hexagonal') {
                const { h, k, i, l } = params;
                const hkil_indices = [h, k, i, l].map(Number);
                const hki_indices = [h, k, i].map(Number);

                if (hkil_indices.every(val => val === 0)) throw new Error('All indices cannot be zero for hexagonal.');
                if (hkil_indices.some(val => !Number.isInteger(val))) throw new Error('Hexagonal indices must be integers.');
                if (hkil_indices.some(val => !Number.isFinite(val))) throw new Error('Invalid hexagonal index value (NaN or Infinity).');
                if (Math.abs(hki_indices.reduce((sum, val) => sum + val, 0)) > 1e-9) { // Check h+k+i = 0 with tolerance
                    throw new Error('Hexagonal indices must satisfy h + k + i = 0.');
                }
            } else {
                throw new Error(`Unsupported crystal system for validation: ${system}`);
            }
            return true;
        } catch (error) {
            CONFIG_UTILS.debug(`Index validation error: ${error.message}`, 'error', error);
            throw error; // Re-throw for main.js or visualizer to catch
        }
    }

    getSolutionSteps(params_input) {
        const { system, axialRatios } = params_input; // Now includes axialRatios
        const effLengths = this._getEffectiveUnitAxisLengths(axialRatios, system);

        try {
             let indicesDisplay;
             let weissParamsDescription;
             let calculatedWeissParamsData = {};
             let axialRatioInfo = "";

             const h_in = params_input.h;
             const k_in = params_input.k;
             const l_in = params_input.l;
             const i_in = params_input.i; // Will be undefined for cubic

             if (system === 'cubic') {
                 const weiss_a = this._calculateSingleWeissParameter(h_in);
                 const weiss_b = this._calculateSingleWeissParameter(k_in);
                 const weiss_c = this._calculateSingleWeissParameter(l_in);
                 indicesDisplay = `(${h_in}, ${k_in}, ${l_in})`;
                 weissParamsDescription = `\\text{Weiss Parameters (multiples of unit axes): } \\\\
                                     a_0 = \\frac{1}{h} = \\frac{1}{${h_in}} = ${UTILS.formatValue(weiss_a)} \\quad (\\text{along a-axis, visual Z}) \\\\
                                     b_0 = \\frac{1}{k} = \\frac{1}{${k_in}} = ${UTILS.formatValue(weiss_b)} \\quad (\\text{along b-axis, visual X}) \\\\
                                     c_0 = \\frac{1}{l} = \\frac{1}{${l_in}} = ${UTILS.formatValue(weiss_c)} \\quad (\\text{along c-axis, visual Y})`;
                calculatedWeissParamsData = {
                    'Weiss Param a₀ (on a-axis)': UTILS.formatValue(weiss_a),
                    'Weiss Param b₀ (on b-axis)': UTILS.formatValue(weiss_b),
                    'Weiss Param c₀ (on c-axis)': UTILS.formatValue(weiss_c)
                };
                axialRatioInfo = `\\text{Using axial ratios: } a/b = ${UTILS.formatValue(axialRatios.a_b)}, c/b = ${UTILS.formatValue(axialRatios.c_b)}`;
             } else if (system === 'hexagonal') {
                 const weiss_a1 = this._calculateSingleWeissParameter(h_in);
                 const weiss_a2 = this._calculateSingleWeissParameter(k_in);
                 const weiss_a3 = this._calculateSingleWeissParameter(i_in);
                 const weiss_c  = this._calculateSingleWeissParameter(l_in);
                 indicesDisplay = `(${h_in}, ${k_in}, ${i_in}, ${l_in})`;
                 weissParamsDescription = `\\text{Weiss Parameters (multiples of unit axes): } \\\\
                                     a1_0 = \\frac{1}{h} = \\frac{1}{${h_in}} = ${UTILS.formatValue(weiss_a1)} \\\\
                                     a2_0 = \\frac{1}{k} = \\frac{1}{${k_in}} = ${UTILS.formatValue(weiss_a2)} \\\\
                                     a3_0 = \\frac{1}{i} = \\frac{1}{${i_in}} = ${UTILS.formatValue(weiss_a3)} \\\\
                                     c_0  = \\frac{1}{l} = \\frac{1}{${l_in}} = ${UTILS.formatValue(weiss_c)}`;
                calculatedWeissParamsData = {
                    'Weiss Param a1₀': UTILS.formatValue(weiss_a1),
                    'Weiss Param a2₀': UTILS.formatValue(weiss_a2),
                    'Weiss Param a3₀': UTILS.formatValue(weiss_a3),
                    'Weiss Param c₀': UTILS.formatValue(weiss_c)
                };
                axialRatioInfo = `\\text{Using axial ratio: } c/a = ${UTILS.formatValue(axialRatios.c_a)}`;
             } else {
                 return [{ step: 1, description: 'Unsupported system for solution steps', math: '', values: {} }];
             }

            const steps = [
                {
                    step: 1,
                    description: `Miller Indices (${system === 'hexagonal' ? 'Miller-Bravais' : 'Miller'}) input:`,
                    math: `(${system === 'hexagonal' ? 'hkil' : 'hkl'}) = ${indicesDisplay}`,
                    values: { h: h_in, k: k_in, ...(system === 'hexagonal' && { i: i_in }), l: l_in }
                },
                {
                    step: 2,
                    description: `Axial ratios for ${system} system:`,
                    math: axialRatioInfo,
                    values: axialRatios
                },
                {
                    step: 3,
                    description: 'Calculate Weiss Parameters (reciprocals of Miller indices, these are the multiples of the respective unit crystallographic axes where the plane intercepts):',
                    math: weissParamsDescription,
                    values: calculatedWeissParamsData
                },
                {
                    step: 4,
                    description: `The plane is visualized by placing these intercepts at distances of (Weiss Parameter × Effective Unit Axis Length) along each corresponding axis.
                                  Effective unit axis lengths for visualization (based on reference length ${this.config.AXIS.LENGTH.toFixed(1)} and ratios):
                                  a_eff = ${effLengths.a.toFixed(3)}, b_eff = ${effLengths.b.toFixed(3)}, c_eff = ${effLengths.c.toFixed(3)}
                                  (Note: For hexagonal, a_eff applies to a1, a2, a3 axes; b_eff is nominal).`,
                    math: `\\text{E.g., intercept coord on a-axis} = (${UTILS.formatValue(system === 'hexagonal' ? this._calculateSingleWeissParameter(h_in) : this._calculateSingleWeissParameter(h_in))}) \\times ${effLengths.a.toFixed(3)}`,
                    values: {} // Actual coordinate values are in the visualization
                }
            ];
            return steps;
        } catch (error) {
            CONFIG_UTILS.debug(`Solution steps generation error: ${error.message}`, 'error', error);
            return [{ step: 1, description: 'Error generating solution steps', math: error.message, values: {} }];
        }
    }

    clearCache() {
        this._cache.clear();
        CONFIG_UTILS.debug('Intercept calculator cache cleared', 'info');
    }

    _getCacheKey(params) {
         const { system, h, k, l, i, axialRatios } = params;
         let key = `${system}-h${h}-k${k}-l${l}`;
         if (system === 'hexagonal') {
             key += `-i${i}`;
         }
         // Add axial ratios to the key, ensuring consistent order and formatting
         if (axialRatios) {
             const ratioKeys = Object.keys(axialRatios).sort();
             ratioKeys.forEach(rk => {
                 key += `-${rk}${axialRatios[rk].toFixed(4)}`; // Use fixed precision for cache key
             });
         }
         return key;
    }
}

window.InterceptCalculator = InterceptCalculator;
