#version 300 es

precision highp float;
precision highp sampler2D;

// Ax = b
uniform sampler2D x;
uniform sampler2D b;

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
    vec2 left = texture(x, uv - xOffset).xy;
    vec2 right = texture(x, uv + xOffset).xy;
    vec2 top = texture(x, uv - yOffset).xy;
    vec2 bottom = texture(x, uv + yOffset).xy;

    // Ax = b obtain b coords
    vec2 bc = texture(b, uv).xy;

    // Final Velocity
    gl_FragCoord = vec4((left + right + top + bottom + alpha * bc)/beta, 0.0, 1.0);
}