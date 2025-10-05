#version 300 es

precision float highp;
precision sampler2D highp;

in o_texCoord;

// Textures to use
uniform sampler2D velocity;
uniform sampler2D vorticity;

// Texel Creation - Scaled texture coordinates
uniform vec2 gridSize;
uniform float gridScale;

// Timestep between frames
uniform float frameTime;
// Epsilon used to denote scale
//uniform float epsilon;
uniform float curl;

void main() {
    // Obtain scaled texture coordinate
    vec2 uv = gl_FragCoord.xy / gridSize.xy;

    // Obtain x and y offsets to retrieve neighbours
    vec2 xOffset = vec2(1.0 / gridSize.x, 0.0);
    vec2 yOffset = vec2(0.0, 1.0 / gridSize.y);

    // Obtain neighbours
    float vl = texture(vorticity, uv - xOffset).x;
    float vr = texture(vorticity, uv + xOffset).x;
    float vb = texture(vorticity, uv - yOffset).x;
    float vt = texture(vorticity, uv + yOffset).x;
    
    // Obtain vorticity at centre of current frag pass
    float vc = texture(vorticity, uv).x;

    // Vorticity Confirement - Reobtain Rotational forces from dissipation
    float scale = 0.5 / gridScale;
    vec2 force = scale * vec2(abs(vt) - abs(vb), abs(vr) - abs(vl));
    //float lengthSquared = max(epsilon, dot(force, force)); - == length(f)
    //force *= inversesqrt(length(force)) * curl * vc;
    force /= length(force) + 0.0001;
    force *= curl*vc;
    force.y *= -1.0;

    vec2 vel = texture(velocity, uv).xy;
    gl_FragColor = vec4(vel + (frameTime*force), 0.0, 1.0);
}