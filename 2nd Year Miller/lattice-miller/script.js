// --- Start of Miller Indices Visualization Script ---

// DOM Elements
const indexTxt = document.getElementById('index_txt');
const viewBtn = document.getElementById('view_btn');
const displayHTxt = document.getElementById('displayH_txt');
const displayKTxt = document.getElementById('displayK_txt');
const displayLTxt = document.getElementById('displayL_txt');
const millerPlaneShape = document.getElementById('miller_plane_shape');
const warnTxt = document.getElementById('warn_txt');
const paraDiv = document.getElementById('para');
const originDisplayTxt = document.getElementById('origin_display_txt');
const originMarkerDot = document.getElementById('origin_marker_dot'); // Get the SVG circle

// Parameters from original script
const hMax = 6;
const kMax = 6;
const lMax = 6;

const w = 71;       // A parameter related to the projection width of one side of the cube
const ht = 30;      // A parameter related to the projection height of one side of the cube
const a = 100;      // Represents the side length of the cube in the projected space along Y and Z axes
const aP = 23.2;    // Angle for the axonometric projection (degrees)

const aSide = Math.round(10 * Math.sqrt(w * w + ht * ht)) / 10; // Effective projected length of the cube's side along X
const angleP = aP * Math.PI / 180; // Projection angle in radians

const cube_x_origin = 221; // SVG x-coordinate of the cube's origin (back bottom corner)
const cube_y_origin = 130; // SVG y-coordinate of the cube's origin (back bottom corner)

// Variables for plane corner coordinates
let p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3;

// Transposition shifts for negative indices
const shiftX_val = aSide * Math.cos(angleP);
const shiftYX_val = aSide * Math.sin(angleP);
const shiftY_val = a;
const shiftZ_val = a;

// --- Utility Functions ---
function showTxt() {
    paraDiv.style.visibility = 'visible';
}

function hideTxt() {
    paraDiv.style.visibility = 'hidden';
}

// --- Transposition Functions (for negative indices) ---
function transposeX() {
    p_x0 -= shiftX_val; p_y0 += shiftYX_val;
    p_x1 -= shiftX_val; p_y1 += shiftYX_val;
    p_x2 -= shiftX_val; p_y2 += shiftYX_val;
    if (p_x3 !== undefined) { // For quadrilaterals
        p_x3 -= shiftX_val; p_y3 += shiftYX_val;
    }
}

function transposeY() {
    p_x0 += shiftY_val;
    p_x1 += shiftY_val;
    p_x2 += shiftY_val;
    if (p_x3 !== undefined) {
        p_x3 += shiftY_val;
    }
}

function transposeZ() {
    p_y0 -= shiftZ_val;
    p_y1 -= shiftZ_val;
    p_y2 -= shiftZ_val;
    if (p_x3 !== undefined) {
        p_y3 -= shiftZ_val;
    }
}

function transposeIfNeeded(h, k, l) {
    // Important: Transposition logic from original code implies specific order or interpretation.
    // The original code structure for transposition was:
    // if (h < 0) transposeX();
    // if (k < 0) transposeY();
    // if (l < 0) transposeZ();
    // This order might matter if transformations are not commutative in the intended geometric sense.

    // Let's apply them based on the intercepts.
    // If h is negative, the x-intercept is negative. We shift the plane.
    if (h < 0) transposeX();
    // If k is negative, the y-intercept is negative.
    if (k < 0) transposeY();
    // If l is negative, the z-intercept is negative.
    if (l < 0) transposeZ();
}

// --- SVG Drawing Functions ---
function drawQuadrilateral(x0, y0, x1, y1, x2, y2, x3, y3) {
    const points = `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
    millerPlaneShape.setAttribute("points", points);
}

function drawTriangle(x0, y0, x1, y1, x2, y2) {
    const points = `${x0},${y0} ${x1},${y1} ${x2},${y2}`;
    millerPlaneShape.setAttribute("points", points);
}

// --- Core Logic: Calculate and Draw Plane ---
function drawPlane(h, k, l) {
    warnTxt.innerHTML = ""; // Clear previous warnings
    millerPlaneShape.setAttribute("points", ""); // Clear previous plane

    if (Math.abs(h) > hMax || Math.abs(k) > kMax || Math.abs(l) > lMax) {
        warnTxt.innerHTML = `Indices must be between -${hMax} and ${hMax}.`;
        return;
    }
    if (h === 0 && k === 0 && l === 0) {
        warnTxt.innerHTML = "Cannot draw plane for (000).";
        return;
    }

    // Calculate reciprocals for intercepts. Max value to avoid division by zero issues if not handled.
    // The "infinity" concept is handled by how the points are calculated when an index is 0.
    const recip_h = (h === 0) ? Infinity : 1 / h;
    const recip_k = (k === 0) ? Infinity : 1 / k;
    const recip_l = (l === 0) ? Infinity : 1 / l;

    // Calculate intercept points in SVG coordinates
    // Point Px on X-axis: (cube_x_origin - intercept_x * Math.cos(angleP), cube_y_origin + intercept_x * Math.sin(angleP))
    // Point Py on Y-axis: (cube_x_origin + intercept_y, cube_y_origin)
    // Point Pz on Z-axis: (cube_x_origin, cube_y_origin - intercept_z)

    // Intercept lengths along axes from origin
    const intercept_x_len = aSide * recip_h;
    const intercept_y_len = a * recip_k;     // 'a' is the projected length along Y
    const intercept_z_len = a * recip_l;     // 'a' is the projected length along Z

    // Reset point coordinates
    p_x0 = p_y0 = p_x1 = p_y1 = p_x2 = p_y2 = p_x3 = p_y3 = undefined;


    if (h !== 0 && k !== 0 && l !== 0) { // Plane intersects all three axes (triangle)
        p_x0 = cube_x_origin - intercept_x_len * Math.cos(angleP);
        p_y0 = cube_y_origin + intercept_x_len * Math.sin(angleP);

        p_x1 = cube_x_origin + intercept_y_len;
        p_y1 = cube_y_origin;

        p_x2 = cube_x_origin;
        p_y2 = cube_y_origin - intercept_z_len;
        
        transposeIfNeeded(h, k, l);
        drawTriangle(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2);

    } else if (h === 0 && k !== 0 && l !== 0) { // Plane parallel to X-axis (intersects Y, Z)
        // Points on YZ plane, forming a line, then extended
        // Point on Y: (cube_x_origin + intercept_y_len, cube_y_origin)
        // Point on Z: (cube_x_origin, cube_y_origin - intercept_z_len)
        // This forms a quadrilateral parallel to X
        p_x0 = cube_x_origin + intercept_y_len; 
        p_y0 = cube_y_origin;
        p_x1 = cube_x_origin;                       
        p_y1 = cube_y_origin - intercept_z_len;

        // Extend parallel to X axis (represented by -aSide*Math.cos(angleP), +aSide*Math.sin(angleP) vector)
        p_x2 = p_x1 - aSide * Math.cos(angleP); 
        p_y2 = p_y1 + aSide * Math.sin(angleP);
        p_x3 = p_x0 - aSide * Math.cos(angleP); 
        p_y3 = p_y0 + aSide * Math.sin(angleP);
        
        transposeIfNeeded(h, k, l); // k, l could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);

    } else if (k === 0 && h !== 0 && l !== 0) { // Plane parallel to Y-axis (intersects X, Z)
        // Point on X, Point on Z
        p_x0 = cube_x_origin - intercept_x_len * Math.cos(angleP);
        p_y0 = cube_y_origin + intercept_x_len * Math.sin(angleP);
        p_x1 = cube_x_origin;
        p_y1 = cube_y_origin - intercept_z_len;

        // Extend parallel to Y axis (represented by +a vector along SVG X)
        p_x2 = p_x1 + a; 
        p_y2 = p_y1;
        p_x3 = p_x0 + a; 
        p_y3 = p_y0;

        transposeIfNeeded(h, k, l); // h, l could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);

    } else if (l === 0 && h !== 0 && k !== 0) { // Plane parallel to Z-axis (intersects X, Y)
        // Point on X, Point on Y
        p_x0 = cube_x_origin - intercept_x_len * Math.cos(angleP);
        p_y0 = cube_y_origin + intercept_x_len * Math.sin(angleP);
        p_x1 = cube_x_origin + intercept_y_len;
        p_y1 = cube_y_origin;

        // Extend parallel to Z axis (represented by -a vector along SVG Y)
        p_x2 = p_x1; 
        p_y2 = p_y1 - a;
        p_x3 = p_x0; 
        p_y3 = p_y0 - a;
        
        transposeIfNeeded(h, k, l); // h, k could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);
    
    } else if (h === 0 && k === 0 && l !== 0) { // Plane parallel to XY plane (intersects Z only) e.g. (001)
        // This is a plane at a constant Z
        p_x0 = cube_x_origin;                                  // Back bottom corner of this plane
        p_y0 = cube_y_origin - intercept_z_len;
        p_x1 = cube_x_origin + a;                              // Extends along Y
        p_y1 = cube_y_origin - intercept_z_len;
        p_x2 = cube_x_origin + a - aSide * Math.cos(angleP);   // Extends along Y then X
        p_y2 = cube_y_origin - intercept_z_len + aSide * Math.sin(angleP);
        p_x3 = cube_x_origin - aSide * Math.cos(angleP);       // Extends along X
        p_y3 = cube_y_origin - intercept_z_len + aSide * Math.sin(angleP);

        transposeIfNeeded(h, k, l); // l could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);

    } else if (h === 0 && l === 0 && k !== 0) { // Plane parallel to XZ plane (intersects Y only) e.g. (010)
        // This is a plane at a constant Y
        p_x0 = cube_x_origin + intercept_y_len;
        p_y0 = cube_y_origin;                                 // Front bottom corner of this plane
        p_x1 = cube_x_origin + intercept_y_len;
        p_y1 = cube_y_origin - a;                             // Extends along Z
        p_x2 = cube_x_origin + intercept_y_len - aSide * Math.cos(angleP);
        p_y2 = cube_y_origin - a + aSide * Math.sin(angleP);  // Extends along Z then X
        p_x3 = cube_x_origin + intercept_y_len - aSide * Math.cos(angleP);
        p_y3 = cube_y_origin + aSide * Math.sin(angleP);      // Extends along X

        transposeIfNeeded(h, k, l); // k could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);

    } else if (k === 0 && l === 0 && h !== 0) { // Plane parallel to YZ plane (intersects X only) e.g. (100)
        // This is a plane at a constant X
        p_x0 = cube_x_origin - intercept_x_len * Math.cos(angleP);
        p_y0 = cube_y_origin + intercept_x_len * Math.sin(angleP); // Top back corner of this plane
        p_x1 = cube_x_origin - intercept_x_len * Math.cos(angleP) + a;
        p_y1 = cube_y_origin + intercept_x_len * Math.sin(angleP); // Extends along Y
        p_x2 = cube_x_origin - intercept_x_len * Math.cos(angleP) + a;
        p_y2 = cube_y_origin + intercept_x_len * Math.sin(angleP) - a; // Extends along Y then Z
        p_x3 = cube_x_origin - intercept_x_len * Math.cos(angleP);
        p_y3 = cube_y_origin + intercept_x_len * Math.sin(angleP) - a; // Extends along Z

        transposeIfNeeded(h, k, l); // h could be negative
        drawQuadrilateral(p_x0, p_y0, p_x1, p_y1, p_x2, p_y2, p_x3, p_y3);
    } else {
        warnTxt.innerHTML = "This combination of indices is not yet fully handled for drawing.";
    }
}


// --- Event Listener and Initial Call ---
function handleViewAction() {
    const t = indexTxt.value.trim();
    let h_val, k_val, l_val;

    // Clear previous display styles
    displayHTxt.classList.remove('overline');
    displayKTxt.classList.remove('overline');
    displayLTxt.classList.remove('overline');
    warnTxt.innerHTML = "";


    if (!t.includes(';')) {
        warnTxt.innerHTML = "Please separate values with a semi-colon (;).";
        displayHTxt.innerHTML = ""; displayKTxt.innerHTML = ""; displayLTxt.innerHTML = "";
        millerPlaneShape.setAttribute("points", ""); // Clear plane
        originDisplayTxt.innerHTML = ""; // Clear previous origin display
        if (originMarkerDot) originMarkerDot.style.visibility = 'hidden'; // Hide dot
        return;
    }

    const t_array = t.split(';');
    if (t_array.length !== 3) {
        warnTxt.innerHTML = "Please enter three indices (h;k;l).";
        displayHTxt.innerHTML = ""; displayKTxt.innerHTML = ""; displayLTxt.innerHTML = "";
        millerPlaneShape.setAttribute("points", ""); // Clear plane
        originDisplayTxt.innerHTML = ""; // Clear previous origin display
        if (originMarkerDot) originMarkerDot.style.visibility = 'hidden'; // Hide dot
        return;
    }

    h_val = parseInt(t_array[0]);
    k_val = parseInt(t_array[1]);
    l_val = parseInt(t_array[2]);

    if (isNaN(h_val) || isNaN(k_val) || isNaN(l_val)) {
        warnTxt.innerHTML = "Indices must be integer numbers.";
        displayHTxt.innerHTML = ""; displayKTxt.innerHTML = ""; displayLTxt.innerHTML = "";
        millerPlaneShape.setAttribute("points", ""); // Clear plane
        originDisplayTxt.innerHTML = ""; // Clear previous origin display
        if (originMarkerDot) originMarkerDot.style.visibility = 'hidden'; // Hide dot
        return;
    }
    
    // Determine and display conceptual origin for plotting
    // The cube is drawn with its back-bottom-left corner at the SVG origin (effectively (0,0,0) of the unit cell).
    // If an index is negative, the plane intercepts that axis on the negative side.
    // The transposition logic shifts the *plane* so it can be drawn within the positive unit cell.
    // This is equivalent to shifting the *plotting origin* in the positive direction along that axis.
    let originXConceptual = 0;
    let originYConceptual = 0;
    let originZConceptual = 0;

    // The current transposition logic shifts the plane if h, k, or l are negative.
    // So, the displayed plane is relative to an origin at (0,0,0) of the drawn unit cell if all h,k,l >= 0.
    // If h < 0, plane is shifted. To plot it from a new origin *within the drawn cell*, that new origin is at x=1.
    if (h_val < 0) originXConceptual = 1;
    if (k_val < 0) originYConceptual = 1;
    if (l_val < 0) originZConceptual = 1;

    originDisplayTxt.innerHTML = `Plotting Origin for Intercepts (within displayed cell): (${originXConceptual}, ${originYConceptual}, ${originZConceptual})`;

    // Calculate SVG coordinates for the origin marker dot
    let svgOriginX = cube_x_origin;
    let svgOriginY = cube_y_origin;

    if (originXConceptual === 1) { // Shifted along crystal X-axis
        svgOriginX -= aSide * Math.cos(angleP); // SVG x decreases
        svgOriginY += aSide * Math.sin(angleP); // SVG y increases
    }
    if (originYConceptual === 1) { // Shifted along crystal Y-axis
        svgOriginX += a; // SVG x increases
    }
    if (originZConceptual === 1) { // Shifted along crystal Z-axis
        svgOriginY -= a; // SVG y decreases
    }

    if (originMarkerDot) {
        originMarkerDot.setAttribute('cx', svgOriginX);
        originMarkerDot.setAttribute('cy', svgOriginY);
        originMarkerDot.style.visibility = 'visible';
    }

    displayHTxt.innerHTML = Math.abs(h_val);
    displayKTxt.innerHTML = Math.abs(k_val);
    displayLTxt.innerHTML = Math.abs(l_val);

    if (h_val < 0) displayHTxt.classList.add('overline');
    if (k_val < 0) displayKTxt.classList.add('overline');
    if (l_val < 0) displayLTxt.classList.add('overline');
    
    drawPlane(h_val, k_val, l_val);
}

viewBtn.addEventListener('click', handleViewAction);
indexTxt.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        handleViewAction();
    }
});

// Initial draw for default values
window.onload = () => {
    handleViewAction(); // Draw for "1;1;1"
};

// --- End of Miller Indices Visualization Script --- 