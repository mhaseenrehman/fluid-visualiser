#version 460 es

uniform sampler2D tex;

in vec2 coords;

out vec4 o_colour;

void main() {
    o_colour = texture(tex, coords);
}