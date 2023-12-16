
const BEDROCK_PLAYER_OFFSET = 1.6200103759765625

module.exports = {

    toNotchianYaw,
    toNotchianPitch,
    fromNotchianYaw,
    fromNotchianPitch,
    vectorToFace,
    faceToVector,
    zigzag32_decode,
    zigzag32_encode,
    euclideanMod,
    toRadians,
    toDegrees,
    BEDROCK_PLAYER_OFFSET,
}

const PI = Math.PI
const PI_2 = Math.PI * 2
const TO_RAD = PI / 180
const TO_DEG = 1 / TO_RAD

function euclideanMod(numerator, denominator) {

    const result = numerator % denominator
    return result < 0 ? result + denominator : result
}
function toRadians(degrees) { return TO_RAD * degrees }
function toDegrees(radians) { return TO_DEG * radians }
function toNotchianYaw(yaw) { return toDegrees(PI - yaw) }
function toNotchianPitch(pitch) { return toDegrees(-pitch) }
function fromNotchianYaw(yaw) { return euclideanMod(PI - toRadians(yaw), PI_2) }
function fromNotchianPitch(pitch) { return euclideanMod(toRadians(-pitch) + PI, PI_2) - PI }

function vectorToFace(v) {

    //stop being lazy
    return [v.y < 0, v.y > 0, v.z < 0, v.z > 0, v.x < 0, v.x > 0].indexOf(true)
}

function faceToVector(face) {

    //stop being lazy
    return [new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(1, 0, 0)][face]
}

function zigzag32_encode(val) { return (val >> 31) ^ (val << 1) }
function zigzag32_decode(val) { return (val >> 1) ^ -(val & 1) }