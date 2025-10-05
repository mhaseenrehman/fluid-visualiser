#version 300 es

precision highp float;
precision highp sampler2D;

in o_texCoord;

uniform vec2 gridSize;
uniform float gridScale;
uniform sampler2D velocity;

void main() {

    // Obtain scaled Texel
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Obtain offsets for x and y
    vec2 xOffset = vec2(1.0 / gridSize.x, 0.0);
    vec2 yOffset = vec2(0.0, 1.0 / gridSize.y);

    // Obtain divergence at neighbouring texture coordinates
    float dl = texture(velocity, uv - xOffset).x;
    float dr = texture(velocity, uv + xOffset).x;
    float db = texture(velocity, uv - yOffset).y;
    float dt = texture(velocity, uv + yOffset).y;

    // Boundaries of the grid
    vec2 c = texture(velocity, uv).xy;
    if ((uv - xOffset).x < 0.0) {dl = -c.x;}
    if ((uv + xOffset).x > 1.0) {dr = -c.x;}
    if ((uv - yOffset).y < 0.0) {db = -c.y;}
    if ((uv + yOffset).y > 1.0) {dt = -c.y;}

    // Obtain final divergence
    float halfrdx = 0.5 / gridScale;
    float divergence = halfrdx * ((dr - dl) + (dt - db));
    gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}