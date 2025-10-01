//------------------------------------------------- GOALS -------------------------------------------------
/*
20: Finish setting up velocity and pressure texture, splat program
21: Finish all shaders from diffusion -> advection -> pressure and setting them up
22: Finish final touches, combining shaders, and rendering to screen
23-30: Test
*/
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

S(u) = P o F o D o A(u) - Advection, then Diffusion, then force application to get a divergent field 
and then projection to arrive at a divergent free field for fluid simulation

Represent Grid as Texture in GPU - 4 textures: 1 for visualising, velocity, pressure and vorticity
GPU does SIMD, therefore use fragment programs for each pixel

Swap() is a function that copies the texture grid to the canvas -> renderToCanvas()
*/
//---------------------------------------------- HTML5 GLOBALS ---------------------------------------------

"use strict"
let canvas = document.getElementById("fluid-simulator-canvas");
let canvasHeight = 800;
let canvasWidth = 800;

// Mouse Globals
let firstMouseX = 960;
let firstMouseY = 480;
let mouseX = -1;
let mouseY = -1;
let isDown = false;
let isDragging = false;
let mouseRadius = 9;
let firstPos;
let forceApplied = false;

//------------------------------------------ FLUID SIMULATION GLOBALS --------------------------------------

/** @type {WebGL2RenderingContext} gl */
let gl;

let frameBufferProgram = null;
let canvasProgram = null;

let texture = null;
let frameBuffer = null;

let lastUpdateTime = Date.now();

let advectionProgram;
let advectionUniforms = {};

let dyeProgram;
let dyeUniforms = {};


//-------------------------------------------- INITIAL SETUP CODE -----------------------------------------
function htmlSetup() {
    canvas.addEventListener("mousedown", (e) => {
        console.log("Mouse Click Detected");
        ({x: firstMouseX, y: firstMouseY} = getMousePos(canvas, e));
        isDown = true;
        isDragging = false;

        renderToFrameBuffer(firstMouseX, firstMouseY);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!isDown) { return; }
        ({x: mouseX, y: mouseY} = getMousePos(canvas, e));

        renderToFrameBuffer(mouseX, mouseY);
        console.log("rendering")

        // Calculate distance between original click position and current click position
        let x = firstMouseX - mouseX;
        let y = firstMouseY - mouseY;
        let dist = x*x + y*y;

        if (dist >= mouseRadius) {
            isDragging = true;
        }

        if (isDragging) {
            //mouse_render(frameBufferProgram);
            console.log("Dragging!")
        }
    });

    canvas.addEventListener("mouseup", (e) => {
        if (!isDown) { return; }
        isDown = false;

        if (!isDragging) {
            // We clicked here, so do something
            console.log("Mouse Click Ended!");
        }
    });
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

//--------------------------------------- FLUID WEBGL SIMULATION CODE -------------------------------------

// Create shader - Upload the GLSL source and compile it
function createShader(type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));  // eslint-disable-line
  gl.deleteShader(shader);
  return undefined;
}

// Create program - Link shaders to program
function createProgram(vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));  // eslint-disable-line
  gl.deleteProgram(program);
  return undefined;
}

// Create texture - Creates empty texture
function createTexture() {
    // Create texture - VELOCITY TEXTURE
    let createdTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, createdTexture);

    // Fill texture - VELOCITY TEXTURE - represents the velocity field of the fluid
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // Set filtering - no need for mips and it's not filtered - CLAMP_TO_EDGE to ensure boundaries of fluid
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return createdTexture;
}

// Create framebuffer - Creates framebuffer and attaches a texture
function createFrameBuffer() {
    // Create framebuffer - Collection of attachments like textures / renderbuffers (support more format than textures but can't be used as direct input to shader)
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // Attach texture as first colour attachment - Bind so we now reference this framebuffer resource
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);
}

// WebGL Entry Setup
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
}

// WebGL Startup
async function start() {
    // Obtain Shader Sources
    let globalVertexShaderSource = await (await fetch("./gl_Programs/globalVertexShader.glsl")).text();
	let globalFragmentShaderSource = await (await fetch("./gl_Programs/globalFragmentShader.glsl")).text();

    let canvasVertexShaderSource = await (await fetch("./gl_Programs/canvasVertexShader.glsl")).text();
	let canvasFragmentShaderSource = await (await fetch("./gl_Programs/canvasFragmentShader.glsl")).text();

    // create GLSL shaders, upload the GLSL source, compile the shaders
    let fbVertexShader = createShader(gl.VERTEX_SHADER, globalVertexShaderSource);
    let fbFragmentShader = createShader(gl.FRAGMENT_SHADER, globalFragmentShaderSource);

    let cvVertexShader = createShader(gl.VERTEX_SHADER, canvasVertexShaderSource);
    let cFragmentShader = createShader(gl.FRAGMENT_SHADER, canvasFragmentShaderSource);

    // Link the two shaders into a program
    frameBufferProgram = createProgram(fbVertexShader, fbFragmentShader);
    canvasProgram = createProgram(cvVertexShader, cFragmentShader);

    // Create a texture, Bind it, fill it with nothing, we are drawing to this later
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Create a framebuffer, bind it and fill it with the texture from earlier
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        // these attachments don't work
        console.log("FRAMEBUFFER ERROR: No framebuffer")
    }

    update();
}

// Main Rendering Code FRAMEBUFFER - Draw to framebuffer
function renderToFrameBuffer(x=980, y=460) {
    // 0 - Clear
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 1 - Use a program
    gl.useProgram(frameBufferProgram);
    
    // 2 - If we are binding to a framebuffer, DrawArrays will draw to the framebuffer NOT the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // 3 - Set viewport to canvas width and height - check if needed or not
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // 4 - Get and Set attribute locations
    const clipX = x / gl.canvas.width  *  2 - 1;
    const clipY = y / gl.canvas.height * -2 + 1;

    const positionAttributeLocation = gl.getAttribLocation(frameBufferProgram, "position");
    gl.vertexAttrib2f(positionAttributeLocation, clipX, clipY);

    // 7 - Draw to either the Canvas or the FrameBuffer
    gl.drawArrays(gl.POINTS, 0, 1);
}

// Main Rendering Code - Draw Final to Canvas
function renderToCanvas() {
    // 1 - Use a program
    gl.useProgram(canvasProgram);
    
    // 2 - If we are binding to a framebuffer, DrawArrays will draw to the framebuffer NOT the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 3 - Set viewport to canvas width and height
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // 4 - Get and Set attribute locations
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var positionAttributeLocation = gl.getAttribLocation(canvasProgram, "position");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     0, 0,
     gl.canvas.width, 0,
     0, gl.canvas.height,
     0, gl.canvas.height,
     gl.canvas.width, 0,
     gl.canvas.width, gl.canvas.height,
  ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    var textureCoordAttributeLocation = gl.getAttribLocation(canvasProgram, "i_texCoord");
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(textureCoordAttributeLocation);
    gl.vertexAttribPointer(textureCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);


    const textureUniformLocation = gl.getUniformLocation(canvasProgram, "tex");
    gl.uniform1i(textureUniformLocation, 0);

    // 7 - Draw to either the Canvas or the FrameBuffer
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function update() {
    resizeCanvasToDisplaySize(gl.canvas);
    renderToCanvas();
    requestAnimationFrame(update);
}

//------------------------------------------ FLUID SIMULATION SETUP ---------------------------------------

function fs_setup(gl) {
    // Setup Textures, framebuffers, shaders, programs etc.
    velocity_texture = createTexture();

    // Advection program setup
    // advectionProgram = createProgram();
    // Diffusion program setup
    // Projection program setup
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
function resizeCanvasToDisplaySize(canvas) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
 
  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
                     canvas.height !== displayHeight;
 
  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }
 
  return needResize;
}

//-------------------------------------------------- MAIN -------------------------------------------------

function glMain() {
    // HTML Setup
    htmlSetup();

    // WebGL Setup
    try {
        glSetup();
    } catch(e) {
        showError(`Uncaught JavaScript Exception: ${e}`);
        return;
    }

    // Start Program
    start();
}

glMain();