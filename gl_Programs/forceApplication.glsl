#version 300 es

precision highp float;

uniform sampler2D grid;

uniform vec3 colour;
uniform vec2 point;
uniform vec2 gridSize;

uniform float radius;

float gaussian(vec2 p, float r) {
    return exp(-dot(p, p) / r);
}

void main() {
    // Obtain Grid Coordinates
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Obtain Base Colour of grid - Usually black
    vec3 base = texture(grid, uv).xyz;

    // Obtain coordinates of Mouse click
    vec2 coords = point.xy - gl_FragCoord.xy;

    // Apply a force dependant on distance from click
    // Larger distance, results in smaller gaussian value
    vec3 force = color * gaussian(coord, gridSize.x * radius);

    // Apply Gaussian Spot Colour
    gl_FragColor = vec4(base + splat, 1.0);
}