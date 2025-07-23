#version 460 es

// Input coordinates of grid point
in vec2 coords;

// Timestep since last iteration, 1 / Grid scale, Input velocity field texture (x vector in Ax = b), Field to be diffused (b vector in Ax = b)
// Set alpha to (x^2)/t and rBeta to 1/(4+(x^2)/t)
uniform float alpha;
uniform float rBeta;
uniform sampler2D velocityGrid;
uniform sampler2D fieldToDiffuse;

// Output velocity field after diffusion
out vec4 outVelocity;

// Function to solve Poisson equations
void jacobi_iterate() {
    // Left, right, bottom, top x (velocity) samples
    vec4 xLeft = texture2D(velocityGrid, coords - vec2(1, 0));
    vec4 xRight = texture2D(velocityGrid, coords + vec2(1, 0));
    vec4 xBottom = texture2D(velocityGrid, coords - vec2(0, 1));
    vec4 xTop = texture2D(velocityGrid, coords + vec2(0, 1));

    // b sample (from centre)
    vec4 bC = texture2D(fieldToDiffuse, coords);

    // Evaluate using Jacobi iteration
    outVelocity = (xLeft + xRight + xBottom + XTop + alpha * bC) * rBeta;
}

void main() {
    // Run 20 to 50 iterations of Jacobi
    for (int i = 0; i < 20; i++) {
        jacobi_iterate();
    }
}