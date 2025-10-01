#version 300 es

precision highp float;

in vec2 texCoord;

uniform sampler2D tex;

out vec4 outColour;

void main() {
    outColour = texture(tex, texCoord);
}