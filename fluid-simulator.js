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

//---------------------------------------------- WEBGL GLOBALS ---------------------------------------------
/** @type {WebGL2RenderingContext} gl */
let gl;

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

// Create shader - Upload the GLSL source and compile it
function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

// Create program - Link shaders to program
function createProgram(vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
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
    gl = canvas.getContext("webgl2");
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
    fs_setup(gl);
}

//----------------------------------------- FLUID SIMULATION GLOBALS --------------------------------------

let lastUpdateTime = Date.now();

let advectionProgram;
let advectionUniforms = {};

let dyeProgram;
let dyeUniforms = {};

//------------------------------------------ FLUID SIMULATION SETUP ---------------------------------------

function fs_setup(gl) {
    // Setup Textures, framebuffers, shaders, programs etc.

    // Advection program setup
    advectionProgram = createProgram();
    
    // Diffusion program setup

    // Projection program setup

}

//------------------------------------------ FLUID SIMULATION CODE ----------------------------------------
// S(u) = P o F o D o A(u) - Advection, then Diffusion, then force application to get a divergent field 
// and then projection to arrive at a divergent free field for fluid simulation

// Represent Grid as Texture in GPU - 4 textures: 1 for visualising, velocity, pressure and vorticity
// GPU does SIMD, therefore use fragment programs for each pixel

function fs_update() {
    const delta = calculateDeltaTime();
    // if (resized) {
    //  initFrameBuffers();
    // }
    obtainInputs();
    fs_step(delta);
    fs_render(null);
    requestAnimationFrame(fluidSimulate_update);
}


function fs_step(delta) {
    // First three steps obtain a divergent field (i.e. matter is either created or destroyed)
    // Obtain zero divergence field by subtracting pressure from gradient
    // Bind one program after another

    // Each bind: use program, set uniforms, fs_draw, then swap
    gl.useProgram(advectionProgram);
    gl.uniform2f();
    fs_draw(velocity_texture);

}

function fs_draw(target, clear = false) {
    gl.createBuffer();
    
    gl.vertexAttribPointer(0, 2, gl.ARRAY_BUFFER, false, 0, 0);
    gl.enableVertexAttribArray(0);
    
    
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (clear) {
        gl.clearColor(0,0,0,0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function fs_render() {

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

// Calculate Time between frames
function calculateDeltaTime() {
    var now = Date.now();
    var dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

// Resize canvas means you need to re-initialise frame buffers
function resizeCanvas() {

}

//-------------------------------------------------- MAIN -------------------------------------------------

function glMain() {
    try {
        glSetup();
    } catch(e) {
        showError(`Uncaught JavaScript Exception: ${e}`);
        return;
    }

    fs_update();
}

glMain();