#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D velocity;
uniform vec2 gridSize;
uniform float gridScale;

void main() {
    // Obtain Scaled texture coordinates
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Obtain x and y offsets to obtain neighbours
    vec2 xOffset = vec2(1.0 / gridSize.x, 0.0);
    vec2 yOffset = vec2(0.0, 1.0 / gridSize.y);

    // Obtain Neighbours
    float vl = texture(velocity, uv - xOffset).y;
    float vr = texture(velocity, uv + xOffset).y;
    float vb = texture(velocity, uv - yOffset).x;
    float vt = texture(velocity, uv + yOffset).x;

    float scale = 0.5 / gridScale;
    gl_FragColor = vec4(scale * (vr - vl - vt + vb), 0.0, 0.0, 1.0);
}