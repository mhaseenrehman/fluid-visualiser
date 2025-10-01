#version 300 es

precision sampler2D highp;
precision float highp;

uniform sampler2D pressure;
uniform vec3 bias;
uniform vec3 scale;

in vec2 texCoord;

void main() {
    gl_FragColor = vec4(bias + scale * texture(pressure, texCoord).xxx, 1.0);
}