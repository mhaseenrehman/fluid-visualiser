#version 300 es

precision highp float;
precision highp sampler2D;

// Ax = b
uniform sampler2D x; // pressure
uniform sampler2D b; // divergence
uniform vec2 gridSize;
uniform float alpha;
uniform float beta;

void main() {
    // Change Resolution of map -> texture coordinates and obtain Texel coords
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Offset - obtain x and y offsets to get neighbouring nodes
    vec2 xOffset = vec2(1.0 / gridSize.x, 0.0);
    vec2 yOffset = vec2(0.0, 1.0 / gridSize.y);

    // Left, right, bottom and top x samples
    float left = texture(x, uv - xOffset).x;
    float right = texture(x, uv + xOffset).x;
    float top = texture(x, uv - yOffset).x;
    float bottom = texture(x, uv + yOffset).x;

    // Ax = b obtain b coords
    float bc = texture(b, uv).x;

    // Final Velocity
    gl_FragCoord = vec4((left + right + top + bottom + (alpha * bc))/beta, 0.0, 0.0, 1.0);
}