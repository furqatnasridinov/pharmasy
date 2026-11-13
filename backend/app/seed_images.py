"""Генератор единообразных SVG-изображений упаковок для seed.

Все картинки в одном стиле: светлый фон, тень, упаковка по форме выпуска
(коробка, флакон, туба, саше, флакон для инъекций) в цвете категории.
Работает без интернета.
"""
from html import escape
from pathlib import Path

CATEGORY_COLORS = {
    "Обезболивающие": ("#E4572E", "#B8401F"),
    "Жаропонижающие": ("#F29E38", "#C47A1E"),
    "Антибиотики": ("#2E7DB5", "#1F5C88"),
    "Витамины": ("#5FAE4E", "#448A36"),
    "Простуда и грипп": ("#3FA7D6", "#2683AE"),
    "ЖКТ": ("#8C6CC8", "#6A4FA3"),
    "Аллергия": ("#E0679A", "#B94C7A"),
    "Дерматология": ("#00A19A", "#007F7A"),
}
DEFAULT_COLORS = ("#00A19A", "#007F7A")
FONT = "Golos Text, Arial, Helvetica, sans-serif"


def _kind(form: str) -> str:
    f = form.lower()
    if "инъекц" in f:
        return "vial"
    if any(w in f for w in ("мазь", "крем", "гель", "паста")):
        return "tube"
    if any(w in f for w in ("порошок", "гранулы")):
        return "sachet"
    if any(w in f for w in ("сироп", "суспензия", "капли", "раствор", "спрей", "аэрозоль")):
        return "bottle"
    return "box"


def _wrap(name: str, max_chars: int) -> list[str]:
    words, lines, line = name.split(), [], ""
    for w in words:
        if line and len(line) + 1 + len(w) > max_chars:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    lines.append(line)
    return lines[:2]


def _title(name: str, cx: float, y: float, width: float, color: str, max_size: int = 40) -> str:
    lines = _wrap(name, 13)
    longest = max(len(line) for line in lines)
    size = min(max_size, int(width / (0.6 * max(longest, 1))))
    out = []
    for i, line in enumerate(lines):
        out.append(
            f'<text x="{cx}" y="{y + i * size * 1.1:.0f}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="800" fill="{color}" text-anchor="middle">{escape(line)}</text>'
        )
    return "".join(out), y + (len(lines) - 1) * size * 1.1


def _small(text: str | None, cx: float, y: float, color: str, size: int = 20, weight: int = 600) -> str:
    if not text:
        return ""
    return (f'<text x="{cx}" y="{y:.0f}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
            f'fill="{color}" text-anchor="middle">{escape(text)}</text>')


def _cross(x: float, y: float, s: float, color: str) -> str:
    a, b = s / 3, 2 * s / 3
    return (f'<path d="M{x + a} {y}h{a}v{a}h{a}v{a}h-{a}v{a}h-{a}v-{a}h-{a}v-{a}h{a}z" fill="{color}"/>')


def _box(name, dosage, package, c1, c2) -> str:
    # Коробка в лёгкой перспективе: передняя грань, бок и крышка
    return (
        f'<path d="M150 190 L190 160 L470 160 L430 190 Z" fill="{c1}" opacity=".55"/>'
        f'<path d="M430 190 L470 160 L470 440 L430 470 Z" fill="{c2}"/>'
        f'<rect x="150" y="190" width="280" height="280" rx="6" fill="#FFFFFF"/>'
        f'<rect x="150" y="190" width="280" height="64" rx="6" fill="{c1}"/>'
        f'<rect x="150" y="240" width="280" height="14" fill="{c1}"/>'
        + _cross(170, 204, 34, "#FFFFFF")
        + f'<text x="414" y="232" font-family="{FONT}" font-size="18" font-weight="700" fill="#FFFFFF" '
          f'text-anchor="end">{escape(package or "")}</text>'
        + _title(name, 290, 318, 250, "#0F2A33")[0]
        + _small(dosage, 290, 420, c2, 26, 700)
        + f'<rect x="150" y="448" width="280" height="22" fill="{c1}" opacity=".18"/>'
    )


def _bottle(name, dosage, package, c1, c2) -> str:
    title, end = _title(name, 300, 330, 190, "#0F2A33", 34)
    return (
        f'<rect x="262" y="118" width="76" height="58" rx="10" fill="{c2}"/>'
        f'<rect x="250" y="168" width="100" height="26" rx="6" fill="{c1}"/>'
        f'<path d="M210 230 Q210 192 250 192 L350 192 Q390 192 390 230 L390 450 Q390 476 364 476 '
        f'L236 476 Q210 476 210 450 Z" fill="{c1}"/>'
        f'<path d="M222 236 Q222 206 250 206 L262 206 L262 466 L236 466 Q222 466 222 452 Z" fill="#FFFFFF" opacity=".18"/>'
        f'<rect x="196" y="262" width="208" height="176" rx="10" fill="#FFFFFF"/>'
        + title
        + _small(dosage, 300, end + 44, c2, 22, 700)
        + _small(package, 300, 424, "#607780", 16, 500)
    )


def _tube(name, dosage, package, c1, c2) -> str:
    title, end = _title(name, 300, 290, 170, "#0F2A33", 32)
    return (
        f'<rect x="268" y="100" width="64" height="54" rx="8" fill="{c2}"/>'
        f'<path d="M232 154 L368 154 L392 196 L392 452 L208 452 L208 196 Z" fill="#FFFFFF"/>'
        f'<path d="M232 154 L368 154 L392 196 L208 196 Z" fill="{c1}"/>'
        f'<rect x="200" y="452" width="200" height="30" rx="4" fill="{c1}"/>'
        f'<path d="M210 467 h180" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8 6" opacity=".6"/>'
        f'<rect x="208" y="400" width="184" height="52" fill="{c1}" opacity=".15"/>'
        + title
        + _small(dosage, 300, end + 46, c2, 24, 700)
        + _small(package, 300, 432, c2, 18, 600)
    )


def _sachet(name, dosage, package, c1, c2) -> str:
    teeth = "".join(f"L{170 + i * 13 + 6.5} {172 if i % 2 == 0 else 180} " for i in range(20))
    title, end = _title(name, 300, 300, 230, "#0F2A33", 36)
    return (
        f'<path d="M170 180 {teeth} L430 180 L430 460 Q430 474 416 474 L184 474 Q170 474 170 460 Z" fill="{c1}"/>'
        f'<rect x="190" y="220" width="220" height="196" rx="14" fill="#FFFFFF"/>'
        + _cross(282, 436, 36, "#FFFFFF")
        + title
        + _small(dosage, 300, end + 46, c2, 24, 700)
        + _small(package, 300, 400, "#607780", 17, 500)
    )


def _vial(name, dosage, package, c1, c2) -> str:
    title, end = _title(name, 300, 340, 150, "#0F2A33", 28)
    return (
        f'<rect x="250" y="150" width="100" height="40" rx="6" fill="#B9C6CB"/>'
        f'<rect x="266" y="186" width="68" height="24" fill="#DCE5E8"/>'
        f'<path d="M226 240 Q226 210 258 210 L342 210 Q374 210 374 240 L374 452 Q374 474 352 474 '
        f'L248 474 Q226 474 226 452 Z" fill="#EAF6F8" stroke="#C7D6DA" stroke-width="3"/>'
        f'<rect x="226" y="276" width="148" height="150" fill="#FFFFFF" stroke="{c1}" stroke-width="3"/>'
        f'<rect x="226" y="276" width="148" height="22" fill="{c1}"/>'
        + title
        + _small(dosage, 300, end + 38, c2, 20, 700)
        + _small(package, 300, 416, "#607780", 15, 500)
    )


DRAWERS = {"box": _box, "bottle": _bottle, "tube": _tube, "sachet": _sachet, "vial": _vial}


def render_svg(name: str, form: str, dosage: str | None, package: str | None, category: str) -> str:
    c1, c2 = CATEGORY_COLORS.get(category, DEFAULT_COLORS)
    body = DRAWERS[_kind(form)](name, dosage, package, c1, c2)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">'
        '<defs><radialGradient id="bg" cx="50%" cy="38%" r="70%">'
        '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6F1F2"/></radialGradient></defs>'
        '<rect width="600" height="600" fill="url(#bg)"/>'
        '<ellipse cx="305" cy="500" rx="190" ry="22" fill="#0F2A33" opacity=".10"/>'
        f'{body}</svg>'
    )


def write_image(directory: Path, filename: str, **kwargs) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_text(render_svg(**kwargs), encoding="utf-8")
