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
let lastUpdateTime = Date.now();

// Textures
let velocity_texture;
let pressure_texture;
let vorticity_texture;
let dye_texture;

// Programs
let forceApplicationProgram;
let advectionProgram;
let pressureCopyProgram;
let pressureProgram;
let divergenceProgram;
let gradientSubtractionProgram;
let vorticityProgram;
let vorticityConfinementProgram;
let displayProgram;

//--------------------------------------------- HTML SETUP CODE -------------------------------------------
function html_setup() {
    canvas.addEventListener("mousedown", (e) => {
        console.log("Mouse Click Detected");
        ({x: firstMouseX, y: firstMouseY} = getMousePos(canvas, e));
        isDown = true;
        isDragging = false;

        //fs_render_frame_buffer(firstMouseX, firstMouseY);
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!isDown) { return; }
        ({x: mouseX, y: mouseY} = getMousePos(canvas, e));

        //fs_render_frame_buffer(mouseX, mouseY);
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

//----------------------------------------- FLUID SIMULATION CLASSES --------------------------------------
class Program {
    // Create shader - Upload the GLSL source and compile it
    createShader(type, source) {
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
    createProgram(vertexShader, fragmentShader) {
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

    // Obtain list of uniforms - More efficient than doing it by hand
    getUniforms(program) {
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(program, i);
            uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
        }
        return uniforms;
    }

    use() {
        gl.useProgram(this.program);
    }

    // Constructor - Create Shaders, Program and then Uniforms
    constructor(vertexSource, fragmentSource) {
        let vertexShader = this.createShader(vertexSource);
        let fragmentShader = this.createShader(fragmentSource);

        this.program = this.createProgram(vertexShader, fragmentShader);
        this.uniforms = this.getUniforms(this.program);
    }
}

class Texture {
    // Create texture - Creates empty texture
    createTexture(width, height, internalFormat, format, type) {
        // Create texture - VELOCITY TEXTURE
        let createdTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, createdTexture);

        // Fill texture - VELOCITY TEXTURE - represents the velocity field of the fluid
        //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

        // Set filtering - no need for mips and it's not filtered - CLAMP_TO_EDGE to ensure boundaries of fluid
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.NEAREST);

        // Return Texture object
        return createdTexture;
    }

    // Create framebuffer - Creates framebuffer and attaches a texture
    createFrameBuffer() {
        // Create framebuffer - Collection of attachments like textures / renderbuffers (support more format than textures but can't be used as direct input to shader)
        let createdFrameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, createdFrameBuffer);

        // Attach texture as first colour attachment - Bind so we now reference this framebuffer resource
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            // Framebuffer Error: These attachments don't work
            console.log("FRAMEBUFFER ERROR: No framebuffer")
        }

        // Colour texture fully
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Return FrameBuffer object
        return createdFrameBuffer;
    }

    // Use Texture - Standard way to bind texture and use it as active one
    useTexture(textureID, texture) {
        gl.activeTexture(gl.TEXTURE0+textureID);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    // Important for post-processing and RTT - Ping pong technique (Can't
    // Perform operations in place therefore, need to swap textures constantly)
    // O(1) performance cost for RTT (two textures) compared to CTT O(n)
    swap() {
        let t = this.readTexture;
        this.readTexture = this.writeTexture;
        this.writeTexture = t;
    }

    constructor(width, height, internalFormat, format, type, double=true) {
        if (double) {
            this.readTexture = this.createTexture(width, height, internalFormat, format, type);
            this.readFrameBuffer = this.createFrameBuffer();

            this.writeTexture = this.createTexture(width, height, internalFormat, format, type);
            this.writeFrameBuffer = this.createFrameBuffer();
        } else {
            this.texture = this.createTexture(width, height, internalFormat, format, type);
            this.frameBuffer = this.createFrameBuffer();
        }
    }
}

//------------------------------------------ FLUID SIMULATION SETUP ---------------------------------------
// WebGL Entry Setup
function gl_setup() {
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

async function fs_setup() {
    // Setup 3 Textures: Velocity, Pressure, Dye - These represent program state
    dye_texture = new Texture(1024, 1024, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, true);
    pressure_texture = new Texture(256, 256, gl.R16F, gl.RED, gl.HALF_FLOAT, true);
    velocity_texture = new Texture(256, 256, gl.RG16F, gl.RG, gl.HALF_FLOAT, true);

    divergence_texture = new Texture(256, 256, gl.R16F, gl.RED, gl.HALF_FLOAT, false);
    vorticity_texture = new Texture(256, 256, gl.RG16F, gl.RG, gl.HALF_FLOAT, false);
    
    // Obtain Shader Sources
    let globalVertexShaderSource = await (await fetch("./gl_Programs/baseVertexShader.glsl")).text();
    let forceApplicationShaderSource = await (await fetch("./gl_Programs/forceApplication.glsl")).text();
    let advectionShaderSource = await (await fetch("./gl_Programs/advect.glsl")).text();
    let pressureCopySource = await (await fetch("./gl_Programs/pressureCopy.glsl")).text(); // clear
    let pressureShaderSource = await (await fetch("./gl_Programs/pressureJacobi.glsl")).text(); // pressure
    let divergenceShaderSource = await (await fetch("./gl_Programs/divergence.glsl")).text();
    let gradientSubtractShaderSource = await (await fetch("./gl_Programs/gradient.glsl")).text();
    let vorticityShaderSource = await (await fetch("./gl_Programs/forceApplication.glsl")).text(); // curl
    let vorticityConfinementShaderSource = await (await fetch("./gl_Programs/forceApplication.glsl")).text(); // vorticity
    let displayShaderSource = await (await fetch("./gl_Programs/forceApplication.glsl")).text();

    // Programs setup
    forceApplicationProgram =       Program(globalVertexShaderSource, forceApplicationShaderSource);
    advectionProgram =              Program(globalVertexShaderSource, advectionShaderSource);
    pressureCopyProgram =           Program(globalVertexShaderSource, pressureCopySource);
    pressureProgram =               Program(globalVertexShaderSource, pressureShaderSource);
    divergenceProgram =             Program(globalVertexShaderSource, divergenceShaderSource);
    gradientSubtractionProgram =    Program(globalVertexShaderSource, gradientSubtractShaderSource);
    vorticityProgram =              Program(globalVertexShaderSource, vorticityShaderSource);
    vorticityConfinementProgram =   Program(globalVertexShaderSource, vorticityConfinementShaderSource);
    displayProgram =                Program(globalVertexShaderSource, displayShaderSource);

    // Start fluid simulation
    fs_update();
} 

//------------------------------------------- FLUID SIMULATION CODE ---------------------------------------

// fs_update - Does the boring stuff and then calls fs_step
function fs_update() {
    // Need frameTime for delta
    const frameTime = calculateDeltaTime();

    // If the canvas has been resized, need to change framebuffers too
    if (resizeCanvasToDisplaySize(gl.canvas)) {
        // TODO: resize the framebuffers to prevent any funny business
    };

    // applyInputs() ? Maybe

    // No pause just yet
    fs_iterate(frameTime);

    // Render to canvas
    fs_display();

    // Loop function
    requestAnimationFrame(fs_update);
}

/** #########################################################*/
/** #################### DOING THIS ONE #####################*/
/** #########################################################*/
// fs_step - Goes through a single iteration of the fluid simulation program
function fs_iterate(frameTime) {
    // Anti-pattern: DON'T USE gl.canvasWidth or gl.canvasHeight -> need to be updated constantly everytime canvas W or H is changed
    gl.disable(gl.BLEND);

    advect(u);

    diffuse(u);

    addForces(u); // Now apply the projection operator to the result.

    p = computePressure(u);

    subtractPressureGradient(u, p);

    dye(u);
}

// Display code - Draw to the canvas the final result of 
function fs_display() {
    // Draw directly the final result of iteration to canvas
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    // Set display program
    displayProgram.use();

    // Set uniforms for display
    gl.uniform1i(displayProgram.uniforms.dye, dye.useTexture(0, dye.readTexture));

    // Draw to Canvas
    fs_draw(null);
}

// Draw code - Draws to either a framebuffer object or the canvas
function fs_draw(target) {
    // 0 - Get and Set attribute locations - Only one attribute needed - Position
    // 1 - Create Position Vertex array buffer - Covers entire screen (in clip-space coordinates)
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        -1, 1,
        1, 1,
        1, -1,
    ]), gl.STATIC_DRAW);

    // 2 - Create index buffer for vertices
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]), gl.STATIC_DRAW);

    // 3 - Enable the vertex buffer and specify how to pull out data
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // 5 - If we are binding to a framebuffer, DrawArrays will draw to the framebuffer NOT the canvas and set Viewport to correct dimensions
    if (!target) {
        // Draw to Canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    } else {
        // Draw to Framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, target);
        gl.viewport(0, 0, target.width, target.height);
    }

    // 6 - Draw to either the Canvas or the FrameBuffer
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
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

function gl_main() {
    // HTML Setup
    html_setup();

    // WebGL Setup
    try {
        gl_setup();
    } catch(e) {
        showError(`Uncaught JavaScript Exception: ${e}`);
        return;
    }

    // Start Program
    fs_setup();
}

gl_main();