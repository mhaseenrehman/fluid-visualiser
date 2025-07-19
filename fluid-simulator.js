//---------------------------------------------- WEBGL2 NOTES ---------------------------------------------
/*
So, WebGL2 works as such:

WebGL runs on GPU and as such, provide progam to this GPU in form of Vertex and Fragment shader written in
glsl. Provide this code in form of 2 functions (vert and frag) shaders

Vertex shader - computes vertex positions in clip space (0 - 1)
Rasterizer - rasterizes each vertex into a primitive like a triangle
Fragment shader - compute colour for each pixel of primitive being drawn

Need to setup state for these functions to get drawn.
Which is where you call gl.drawElements or gl.drawArrays. These execute your shaders on the GPU

We will be using Textures for these programs to access data
*/

//----------------------------------------------- WEBGL CODE ----------------------------------------------

function createTexture() {
    // Create texture - VELOCITY TEXTURE
    var velocity_texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, velocity_texture);

    // Fill texture - VELOCITY TEXTURE - represents the velocity field of the fluid
    const level = 0;
    const internalFormat = gl.RGBA;
    const border = 0;
    const format = gl.RGBA;
    const type = gl.FLOAT;
    const data = null;
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

    // Set filtering - no need for mips and it's not filtered - CLAMP_TO_EDGE to ensure boundaries of fluid
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return velocity_texture;
}

function createFrameBuffer() {

}

// Create shader, upload the GLSL source and compile it
/** @param {WebGL2RenderingContext} gl */
function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    
}

function createProgram() {

}

// Main Entry Setup
function glSetup() {
    /** @type {HTMLCanvasElement|null} */

    // Obtain canvas
    const canvas = document.getElementById("fluid-simulator-canvas");
    if (!canvas) {
        showError("ERROR: Cannot get fluid simulator canvas!");
        return;
    }

    // Obtain WebGL Context
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        const gl1 = !!canvas.getContext("webgl");
        if (gl1) {
            showError("This browser supports WebGL 1 but not 2");
        } else {
            showError("ERROR: Cannot get WebGL context! Does not support either WebGL 1 or 2");
        }
        return;
    }

    // Set up fluid simulation program
    fluidSimulatorSetup(gl);
}

//------------------------------------------ FLUID SIMULATION SETUP ---------------------------------------

/** @param {WebGL2RenderingContext} gl */
function setupVelocityTexture(gl, height, width) {
}

/** @param {WebGL2RenderingContext} gl */
function setupPressureTexture(gl) {

}

/** @param {WebGL2RenderingContext} gl */
function setupVorticityTexture(gl) {

}

/** @param {WebGL2RenderingContext} gl */
function setupVisualTexture(gl) {

}

function createTexture() {

}

/** @param {WebGL2RenderingContext} gl */
function fluidSimulatorSetup(gl) {
    // Setup textures for properties of fluid
}

//------------------------------------------ FLUID SIMULATION CODE ----------------------------------------
// S(u) = P o F o D o A(u) - Advection, then Diffusion, then force application to get a divergent field 
// and then projection to arrive at a divergent free field for fluid simulation

// Represent Grid as Texture in GPU - 4 textures: 1 for visualising, velocity, pressure and vorticity
// GPU does SIMD, therefore use fragment programs for each pixel

function fluidSimulate_update() {

}

function fluidSimulate_step() {
    // First three steps obtain a divergent field (i.e. matter is either created or destroyed)
    
    // Obtain zero divergence field by subtracting pressure from gradient
}

//--------------------------------------------- MISCELLANEOUS ---------------------------------------------

// Function that displays any error
function showError(error) {
    const errorBox = document.getElementById("error-box");
    const errorTextElement = document.createElement("p");
    errorTextElement.innerText = error;
    errorBox.appendChild(errorTextElement);
    console.log(error);
}

//-------------------------------------------------- MAIN -------------------------------------------------

function glMain() {
    try {
        glSetup();
    } catch(e) {
        showError(`Uncaught JavaScript Exception: ${e}`);
    }
}

glMain();