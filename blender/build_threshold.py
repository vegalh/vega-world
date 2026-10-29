"""
The Threshold — homepage environment for vegalh.github.io

Builds the scene, bakes ambient occlusion into vertex colours, renders a
preview, and exports assets/3d/threshold.glb.

Run headless from the repository root:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P blender/build_threshold.py -- [--preview out.png] [--no-export]

Blender is Z-up and looks down +Y here; glTF export converts to three.js Y-up
(Blender (x, y, z) -> three (x, z, -y)).
"""

import bpy
import bmesh
import math
import random
import sys
import os
from mathutils import Vector, noise

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PREVIEW = ARGS[ARGS.index("--preview") + 1] if "--preview" in ARGS else None
EXPORT = "--no-export" not in ARGS
rng = random.Random(11)

# ----------------------------------------------------------------- layout
GATE = Vector((3.4, 24.0, 0.0))           # the doorway, standing in the lake
LAKE_C = Vector((0.0, 31.0))              # lake ellipse centre
LAKE_R = (25.0, 33.0)                     # lake radii (x, y)
PALETTE = {
    "bank":   (0.20, 0.15, 0.24),
    "hill":   (0.33, 0.27, 0.42),
    "high":   (0.46, 0.41, 0.58),
    "shore":  (0.42, 0.36, 0.44),
    "stone":  (0.70, 0.66, 0.74),
    "gate":   (0.83, 0.79, 0.84),
    "forest": (0.10, 0.09, 0.15),
    "reed":   (0.16, 0.13, 0.20),
    "ridge":  (0.40, 0.37, 0.55),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def fbm(x, y, octaves=4, seed=0.0):
    v, a, f = 0.0, 1.0, 1.0
    for _ in range(octaves):
        v += a * noise.noise(Vector((x * f, y * f, seed)))
        a *= 0.5
        f *= 2.03
    return v


def lake_d(x, y):
    """<1 inside the lake ellipse, 1 on its shore."""
    return math.hypot((x - LAKE_C.x) / LAKE_R[0], (y - LAKE_C.y) / LAKE_R[1])


def height(x, y):
    d = lake_d(x, y) + 0.06 * fbm(x * 0.08, y * 0.08, 3, 4.0)
    basin = -1.4 + 1.6 * smoothstep(0.82, 1.0, d)              # lake bed rises to shore
    rise = smoothstep(1.0, 1.9, d)                              # land climbs away from water
    hills = rise * (1.6 + 4.2 * (0.5 + 0.5 * fbm(x * 0.035, y * 0.035, 4, 1.0)))
    back = smoothstep(75, 145, y) * (9 + 14 * (0.5 + 0.5 * fbm(x * 0.02, 7.1, 3, 2.0)))
    detail = 0.25 * fbm(x * 0.3, y * 0.3, 2, 9.0) * rise
    # the near bank where the visitor stands: low, gentle
    near = smoothstep(4, -10, y)
    h = basin + hills + back + detail
    h = h * (1 - near * 0.65) + near * (0.35 + 0.15 * fbm(x * 0.2, y * 0.2, 2, 3.0))
    return h


def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def set_colors(ob, fn):
    """Write a per-corner base colour attribute named Col via fn(world_co, normal)."""
    me = ob.data
    attr = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    mw = ob.matrix_world
    for poly in me.polygons:
        n = (mw.to_3x3() @ poly.normal).normalized()
        for li in poly.loop_indices:
            co = mw @ me.vertices[me.loops[li].vertex_index].co
            c = fn(co, n)
            attr.data[li].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = me.color_attributes.find("Col")


def shade_smooth(ob):
    for p in ob.data.polygons:
        p.use_smooth = True


def mix(a, b, t):
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))


# ----------------------------------------------------------------- terrain
def build_terrain():
    bm = bmesh.new()
    nx, ny = 170, 150
    x0, x1, y0, y1 = -120.0, 120.0, -26.0, 170.0
    verts = []
    for j in range(ny + 1):
        # denser rows near the camera, sparser far away
        t = j / ny
        y = y0 + (y1 - y0) * (t ** 1.55)
        row = []
        for i in range(nx + 1):
            s = i / nx
            # denser columns near the centre line
            u = (s - 0.5) * 2
            x = (abs(u) ** 1.3) * math.copysign(1, u) * (x1 - x0) / 2
            row.append(bm.verts.new((x, y, height(x, y))))
        verts.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    ob = mesh_obj("Terrain", bm)
    shade_smooth(ob)

    def col(co, n):
        h = co.z
        slope = 1 - max(0.0, n.z)
        c = mix(PALETTE["bank"], PALETTE["hill"], smoothstep(0.5, 6, h))
        c = mix(c, PALETTE["high"], smoothstep(8, 20, h))
        c = mix(c, PALETTE["shore"], smoothstep(0.6, 0.0, abs(h)) * 0.7)   # pale water line
        c = mix(c, PALETTE["bank"], slope * 0.35)
        return c
    set_colors(ob, col)
    return ob


def build_ridges():
    """Two far silhouettes that dissolve into the fog."""
    bm = bmesh.new()
    for k, (y, base, amp, seed) in enumerate([(185, 14, 22, 1.7), (240, 22, 30, 5.3)]):
        top, bot = [], []
        for i in range(121):
            x = -320 + 640 * i / 120
            h = base + amp * (0.55 + 0.45 * fbm(x * 0.012, seed, 4, seed))
            top.append(bm.verts.new((x, y + 6 * math.sin(x * 0.02 + k), h)))
            bot.append(bm.verts.new((x, y, -5)))
        for i in range(120):
            bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
    ob = mesh_obj("Ridges", bm)
    set_colors(ob, lambda co, n: PALETTE["ridge"])
    return ob


# ----------------------------------------------------------------- the doorway
def build_gate():
    bm = bmesh.new()
    w, h, t, d = 1.45, 3.9, 0.19, 0.3          # inner width, height, post thickness, depth

    def box(cx, cz, sx, sz):
        r = bmesh.ops.create_cube(bm, size=1.0)
        for v in r["verts"]:
            v.co.x = v.co.x * sx + cx
            v.co.y = v.co.y * d
            v.co.z = v.co.z * sz + cz
    box(-(w + t) / 2, 0.25 + h / 2, t, h)
    box((w + t) / 2, 0.25 + h / 2, t, h)
    box(0, 0.25 + h + t / 2, w + 2 * t + 0.22, t * 1.1)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    ob = mesh_obj("Gate", bm)
    ob.location = GATE
    bev = ob.modifiers.new("bevel", "BEVEL")
    bev.width = 0.035
    bev.segments = 3
    bev.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    ob.select_set(False)
    shade_smooth(ob)
    set_colors(ob, lambda co, n: mix(PALETTE["gate"], PALETTE["stone"], 0.4 * (1 - max(0, n.z))))

    # the light inside the doorway, replaced by a shader in three.js
    bm = bmesh.new()
    a = bm.verts.new((-w / 2, 0, 0.25))
    b = bm.verts.new((w / 2, 0, 0.25))
    c = bm.verts.new((w / 2, 0, 0.25 + h))
    e = bm.verts.new((-w / 2, 0, 0.25 + h))
    bm.faces.new((a, b, c, e))
    light = mesh_obj("GateLight", bm)
    light.location = GATE + Vector((0, 0.04, 0))
    uv = light.data.uv_layers.new(name="UVMap")
    for li, (u, v) in zip(range(4), [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[li].uv = (u, v)

    # a low round platform the doorway stands on
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=1.9, radius2=1.75, depth=0.7)
    for v in bm.verts:
        ang = math.atan2(v.co.y, v.co.x)
        k = 1 + 0.05 * noise.noise(Vector((math.cos(ang) * 2, math.sin(ang) * 2, 3.3)))
        v.co.x *= k
        v.co.y *= k
    plat = mesh_obj("Platform", bm)
    plat.location = GATE + Vector((0, 0, -0.2))
    bev = plat.modifiers.new("bevel", "BEVEL")
    bev.width = 0.12
    bev.segments = 3
    bpy.context.view_layer.objects.active = plat
    plat.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    plat.select_set(False)
    shade_smooth(plat)
    set_colors(plat, lambda co, n: mix(PALETTE["stone"], PALETTE["shore"], smoothstep(0.2, -0.3, co.z)))
    return ob, light, plat


# ----------------------------------------------------------------- path of stones
STONE_PATH = []


def build_stones():
    bm_all = bmesh.new()
    n = 7
    ts = [0.0, 0.13, 0.3, 0.44, 0.6, 0.77, 0.9]
    for i in range(n):
        t = ts[i]
        y = 2.6 + t * (GATE.y - 2.4 - 2.6)
        x = 0.3 + (GATE.x - 0.3) * (t ** 1.4) - 1.3 * math.sin(t * math.pi) + rng.uniform(-0.15, 0.15)
        r = 0.5 - 0.1 * t + rng.uniform(-0.06, 0.06)
        STONE_PATH.append((x, y))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1.0)
        seed = rng.uniform(0, 100)
        for v in bm.verts:
            k = 1 + 0.12 * noise.noise(v.co * 1.6 + Vector((seed, 0, 0)))
            v.co *= k
            v.co.x *= r * 1.15
            v.co.y *= r
            v.co.z = max(v.co.z, -0.4) * 0.16
        rot = rng.uniform(0, math.pi)
        for v in bm.verts:
            x0, y0 = v.co.x, v.co.y
            v.co.x = x0 * math.cos(rot) - y0 * math.sin(rot) + x
            v.co.y = x0 * math.sin(rot) + y0 * math.cos(rot) + y
            v.co.z += 0.03
        me = bpy.data.meshes.new("tmp")
        bm.to_mesh(me)
        bm.free()
        bm_all.from_mesh(me)
        bpy.data.meshes.remove(me)
    ob = mesh_obj("Stones", bm_all)
    shade_smooth(ob)
    set_colors(ob, lambda co, n: mix(PALETTE["shore"], PALETTE["stone"], smoothstep(-0.02, 0.16, co.z)))
    return ob


# ----------------------------------------------------------------- forest + reeds
def conifer(bm, x, y, h, lean):
    """A slender spire: one irregular lathed silhouette, not stacked cones."""
    z0 = height(x, y) - 0.4
    r = h * rng.uniform(0.09, 0.13)
    seg, rings = 8, 10
    seed = rng.uniform(0, 50)
    ring_verts = []
    for k in range(rings):
        f = k / rings
        rad = r * (1 - f) ** 0.85 * (0.8 + 0.35 * abs(noise.noise(Vector((seed, f * 6, 0)))))
        z = z0 + h * (0.08 + 0.92 * f)
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg + k * 0.4
            ring.append(bm.verts.new((x + math.cos(a) * rad + lean * (z - z0), y + math.sin(a) * rad, z)))
        ring_verts.append(ring)
    tip = bm.verts.new((x + lean * h, y, z0 + h))
    for k in range(rings - 1):
        for i in range(seg):
            a, b = ring_verts[k][i], ring_verts[k][(i + 1) % seg]
            c, d = ring_verts[k + 1][(i + 1) % seg], ring_verts[k + 1][i]
            bm.faces.new((a, b, c, d))
    for i in range(seg):
        bm.faces.new((ring_verts[-1][i], ring_verts[-1][(i + 1) % seg], tip))


def build_forest():
    bm = bmesh.new()
    groups = [  # (cx, cy, spread x, spread y, count, height range)
        (-25, 14, 7, 12, 34, (7, 14)),     # dark mass framing the left
        (-30, 40, 8, 10, 22, (8, 13)),
        (27, 30, 6, 12, 28, (7, 15)),      # mass behind the doorway, to its right
        (12, 70, 16, 5, 30, (6, 11)),      # distant far-shore band, fog-softened
        (-12, 72, 12, 4, 20, (6, 10)),
    ]
    for cx, cy, sx, sy, n, (h0, h1) in groups:
        for _ in range(n):
            x = cx + rng.gauss(0, sx * 0.5)
            y = cy + rng.gauss(0, sy * 0.5)
            if lake_d(x, y) < 1.05:
                continue
            conifer(bm, x, y, rng.uniform(h0, h1), rng.uniform(-0.03, 0.03))
    ob = mesh_obj("Forest", bm)
    set_colors(ob, lambda co, n: mix(PALETTE["forest"], PALETTE["hill"], 0.18 * max(0, n.z)))
    return ob


def build_reeds():
    bm = bmesh.new()
    clumps = [(-6.2, 4.2, 22), (-9.0, 6.0, 16), (5.6, 5.2, 18), (8.4, 3.6, 12)]
    for cx, cy, n in clumps:
        for _ in range(n):
            x = cx + rng.gauss(0, 0.6)
            y = cy + rng.gauss(0, 0.5)
            z = max(height(x, y), -0.2)
            hgt = rng.uniform(0.5, 1.2)
            w = rng.uniform(0.02, 0.04)
            bend = Vector((rng.uniform(-0.25, 0.25), rng.uniform(-0.1, 0.25), 0))
            a = bm.verts.new((x - w, y, z))
            b = bm.verts.new((x + w, y, z))
            m = bm.verts.new((x + bend.x * 0.4, y + bend.y * 0.4, z + hgt * 0.55))
            t = bm.verts.new((x + bend.x, y + bend.y, z + hgt))
            bm.faces.new((a, b, m))
            bm.faces.new((a, m, t))
    ob = mesh_obj("Reeds", bm)
    set_colors(ob, lambda co, n: PALETTE["reed"])
    return ob


def build_water():
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
    ob = mesh_obj("Water", bm)
    ob.scale = (110, 110, 1)
    ob.location = (0, 50, 0)
    return ob


# ----------------------------------------------------------------- materials
def vc_material(name, rough=0.9, emit=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = 6.0
    return m


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


# ----------------------------------------------------------------- AO bake
def bake_ao(objs):
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.samples = 48
    scn.cycles.device = "CPU"
    for ob in objs:
        ao = ob.data.color_attributes.new("AO", "BYTE_COLOR", "CORNER")
        ob.data.color_attributes.active_color = ao
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    for ob in objs:
        me = ob.data
        col, ao = me.color_attributes["Col"], me.color_attributes["AO"]
        for i in range(len(col.data)):
            a = ao.data[i].color[0]
            a = 0.35 + 0.65 * a                      # soften: never fully black
            c = col.data[i].color
            col.data[i].color = (c[0] * a, c[1] * a, c[2] * a, 1)
        me.color_attributes.remove(ao)
        me.color_attributes.active_color = me.color_attributes["Col"]
        me.color_attributes.render_color_index = me.color_attributes.find("Col")


# ----------------------------------------------------------------- preview
def preview(path):
    scn = bpy.context.scene
    try:
        scn.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scn.render.engine = "BLENDER_EEVEE_NEXT"
    scn.render.resolution_x, scn.render.resolution_y = 1600, 900
    scn.view_settings.view_transform = "AgX"
    scn.view_settings.look = "AgX - Medium High Contrast" if "AgX - Medium High Contrast" in [i.identifier for i in type(scn.view_settings).bl_rna.properties["look"].enum_items] else "None"

    # twilight world: vertical gradient + thin volume for depth
    world = bpy.data.worlds.new("Dusk")
    scn.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    remap = nt.nodes.new("ShaderNodeMapRange")
    remap.inputs["From Min"].default_value = -0.15
    remap.inputs["From Max"].default_value = 0.6
    nt.links.new(sep.outputs["Z"], remap.inputs["Value"])
    nt.links.new(remap.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.18, (0.95, 0.66, 0.58, 1)
    els[1].position, els[1].color = 1.0, (0.05, 0.04, 0.11, 1)
    mid = els.new(0.38)
    mid.color = (0.45, 0.32, 0.55, 1)
    bg.inputs["Strength"].default_value = 1.6
    # EEVEE hides the sky behind a world volume, so depth fog lives in three.js instead

    sun = bpy.data.lights.new("Moon", "SUN")
    sun.energy = 2.0
    sun.color = (0.75, 0.78, 1.0)
    so = bpy.data.objects.new("Moon", sun)
    so.rotation_euler = (math.radians(70), 0, math.radians(200))
    bpy.context.collection.objects.link(so)
    pl = bpy.data.lights.new("GateGlow", "POINT")
    pl.energy = 350
    pl.color = (1.0, 0.8, 0.5)
    pl.shadow_soft_size = 1.2
    po = bpy.data.objects.new("GateGlow", pl)
    po.location = GATE + Vector((0, -0.6, 2.0))
    bpy.context.collection.objects.link(po)

    cam = bpy.data.cameras.new("Cam")
    cam.lens = 30
    co = bpy.data.objects.new("Cam", cam)
    co.location = (0.0, -3.0, 1.75)
    direction = (GATE + Vector((-6.0, 0, 3.0))) - co.location
    co.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(co)
    scn.camera = co

    # a still mirror for the preview only
    water = bpy.data.objects["Water"]
    wm = bpy.data.materials.new("WaterPreview")
    wm.use_nodes = True
    b = wm.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.05, 0.04, 0.09, 1)
    b.inputs["Roughness"].default_value = 0.04
    b.inputs["Metallic"].default_value = 0.4
    assign(water, wm)
    try:
        scn.eevee.use_raytracing = True
    except AttributeError:
        pass
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ----------------------------------------------------------------- main
def main():
    reset()
    terrain = build_terrain()
    ridges = build_ridges()
    gate, gate_light, platform = build_gate()
    stones = build_stones()
    forest = build_forest()
    reeds = build_reeds()
    water = build_water()

    mats = {
        "Terrain": vc_material("Land"), "Ridges": vc_material("Ridge"),
        "Gate": vc_material("Stone", 0.75), "Platform": vc_material("Stone2", 0.8),
        "Stones": vc_material("Stone3", 0.7), "Forest": vc_material("Forest"),
        "Reeds": vc_material("Reed"),
    }
    for ob in (terrain, ridges, gate, platform, stones, forest, reeds):
        assign(ob, mats[ob.name])
    lm = bpy.data.materials.new("Light")
    lm.use_nodes = True
    lm.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (1, 0.82, 0.55, 1)
    lm.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 3
    assign(gate_light, lm)

    bake_ao([terrain, gate, platform, stones, forest])

    if EXPORT:
        out = os.path.join(ROOT, "assets", "3d", "threshold.glb")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        bpy.ops.object.select_all(action="DESELECT")
        for ob in (terrain, ridges, gate, gate_light, platform, stones, forest, reeds, water):
            ob.select_set(True)
        bpy.ops.export_scene.gltf(
            filepath=out, export_format="GLB", use_selection=True,
            export_yup=True, export_apply=True, export_normals=True,
            export_vertex_color="ACTIVE", export_materials="EXPORT",
            export_texcoords=True, export_cameras=False, export_lights=False,
        )
        print("EXPORTED", out, os.path.getsize(out))
        print("STONE_PATH", [(round(x, 2), round(y, 2)) for x, y in STONE_PATH])

    if PREVIEW:
        preview(PREVIEW)
        print("PREVIEW", PREVIEW)


main()
