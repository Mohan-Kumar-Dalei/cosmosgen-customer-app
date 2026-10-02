import ArrowClockwise from "phosphor-react-native/lib/module/icons/ArrowClockwise";
import ArrowCounterClockwise from "phosphor-react-native/lib/module/icons/ArrowCounterClockwise";
import ArrowElbowDownRight from "phosphor-react-native/lib/module/icons/ArrowElbowDownRight";
import ArrowLeft from "phosphor-react-native/lib/module/icons/ArrowLeft";
import ArrowRight from "phosphor-react-native/lib/module/icons/ArrowRight";
import ArrowUp from "phosphor-react-native/lib/module/icons/ArrowUp";
import ArrowUpRight from "phosphor-react-native/lib/module/icons/ArrowUpRight";
import ArrowsClockwise from "phosphor-react-native/lib/module/icons/ArrowsClockwise";
import Bell from "phosphor-react-native/lib/module/icons/Bell";
import BookmarkSimple from "phosphor-react-native/lib/module/icons/BookmarkSimple";
import Briefcase from "phosphor-react-native/lib/module/icons/Briefcase";
import Bug from "phosphor-react-native/lib/module/icons/Bug";
import CalendarBlank from "phosphor-react-native/lib/module/icons/CalendarBlank";
import Camera from "phosphor-react-native/lib/module/icons/Camera";
import CaretDown from "phosphor-react-native/lib/module/icons/CaretDown";
import CaretLeft from "phosphor-react-native/lib/module/icons/CaretLeft";
import CaretRight from "phosphor-react-native/lib/module/icons/CaretRight";
import CaretUp from "phosphor-react-native/lib/module/icons/CaretUp";
import ChatCentered from "phosphor-react-native/lib/module/icons/ChatCentered";
import ChatCircleDots from "phosphor-react-native/lib/module/icons/ChatCircleDots";
import Check from "phosphor-react-native/lib/module/icons/Check";
import CheckCircle from "phosphor-react-native/lib/module/icons/CheckCircle";
import Circle from "phosphor-react-native/lib/module/icons/Circle";
import CircleNotch from "phosphor-react-native/lib/module/icons/CircleNotch";
import Clipboard from "phosphor-react-native/lib/module/icons/Clipboard";
import Clock from "phosphor-react-native/lib/module/icons/Clock";
import DownloadSimple from "phosphor-react-native/lib/module/icons/DownloadSimple";
import Drop from "phosphor-react-native/lib/module/icons/Drop";
import Feather from "phosphor-react-native/lib/module/icons/Feather";
import FileText from "phosphor-react-native/lib/module/icons/FileText";
import Funnel from "phosphor-react-native/lib/module/icons/Funnel";
import Gear from "phosphor-react-native/lib/module/icons/Gear";
import Globe from "phosphor-react-native/lib/module/icons/Globe";
import Hammer from "phosphor-react-native/lib/module/icons/Hammer";
import Headphones from "phosphor-react-native/lib/module/icons/Headphones";
import House from "phosphor-react-native/lib/module/icons/House";
import Image from "phosphor-react-native/lib/module/icons/Image";
import Info from "phosphor-react-native/lib/module/icons/Info";
import Key from "phosphor-react-native/lib/module/icons/Key";
import Lightning from "phosphor-react-native/lib/module/icons/Lightning";
import ListChecks from "phosphor-react-native/lib/module/icons/ListChecks";
import Lock from "phosphor-react-native/lib/module/icons/Lock";
import MagnifyingGlass from "phosphor-react-native/lib/module/icons/MagnifyingGlass";
import MapPin from "phosphor-react-native/lib/module/icons/MapPin";
import MapTrifold from "phosphor-react-native/lib/module/icons/MapTrifold";
import Minus from "phosphor-react-native/lib/module/icons/Minus";
import NavigationArrow from "phosphor-react-native/lib/module/icons/NavigationArrow";
import PaintBrush from "phosphor-react-native/lib/module/icons/PaintBrush";
import PencilSimple from "phosphor-react-native/lib/module/icons/PencilSimple";
import Phone from "phosphor-react-native/lib/module/icons/Phone";
import Plus from "phosphor-react-native/lib/module/icons/Plus";
import Prohibit from "phosphor-react-native/lib/module/icons/Prohibit";
import Question from "phosphor-react-native/lib/module/icons/Question";
import ShieldCheck from "phosphor-react-native/lib/module/icons/ShieldCheck";
import SignOut from "phosphor-react-native/lib/module/icons/SignOut";
import SlidersHorizontal from "phosphor-react-native/lib/module/icons/SlidersHorizontal";
import Square from "phosphor-react-native/lib/module/icons/Square";
import SquaresFour from "phosphor-react-native/lib/module/icons/SquaresFour";
import Star from "phosphor-react-native/lib/module/icons/Star";
import Tag from "phosphor-react-native/lib/module/icons/Tag";
import Thermometer from "phosphor-react-native/lib/module/icons/Thermometer";
import Trash from "phosphor-react-native/lib/module/icons/Trash";
import Tray from "phosphor-react-native/lib/module/icons/Tray";
import User from "phosphor-react-native/lib/module/icons/User";
import UserCheck from "phosphor-react-native/lib/module/icons/UserCheck";
import Users from "phosphor-react-native/lib/module/icons/Users";
import Warning from "phosphor-react-native/lib/module/icons/Warning";
import WarningCircle from "phosphor-react-native/lib/module/icons/WarningCircle";
import WifiSlash from "phosphor-react-native/lib/module/icons/WifiSlash";
import Wind from "phosphor-react-native/lib/module/icons/Wind";
import Wrench from "phosphor-react-native/lib/module/icons/Wrench";
import X from "phosphor-react-native/lib/module/icons/X";
import XCircle from "phosphor-react-native/lib/module/icons/XCircle";

/**
 * Every mark in the app, from Phosphor.
 *
 * Mohan asked for vectors rather than pictures - an icon should take the
 * colour it is given and stay crisp at any size, not be a PNG somebody redraws
 * for a new palette - and Phosphor is the set he named. It replaces Remix,
 * which was the set before it; the keys below are unchanged, so swapping the
 * whole app over was this file and nothing else.
 *
 * Imported one file at a time rather than from the package's own index. That
 * index reaches every icon in the set, which is a few megabytes of SVG for the
 * seventy this app draws, on the handsets the product exists to keep working
 * on. Naming them costs a line each and bundles exactly what is used.
 *
 * The keys are Feather spellings, from the set the app used before Remix. They
 * stayed through both changes for the same reason: a call site should not have
 * to care which library is underneath. New code should use the plain names
 * here rather than hunting for a Feather one.
 *
 * Each entry is the component and, where the mark reads better solid, the
 * weight to draw it at. A star, a tick and the tab you are standing on are
 * filled; everything else is Phosphor's regular outline, which is what gives
 * the set its evenness.
 */
const MARKS = {

    /* movement */
    "arrow-left": [ArrowLeft],
    "arrow-right": [ArrowRight],
    "arrow-up": [ArrowUp],
    "arrow-up-right": [ArrowUpRight],
    "corner-down-right": [ArrowElbowDownRight],
    "chevron-down": [CaretDown],
    "chevron-up": [CaretUp],
    "chevron-right": [CaretRight],
    "chevron-left": [CaretLeft],

    /* how a thing is going */
    check: [Check],
    "check-circle": [CheckCircle, "fill"],
    circle: [Circle],
    x: [X],
    "x-circle": [XCircle],
    slash: [Prohibit],
    "alert-circle": [WarningCircle],
    "alert-triangle": [Warning],
    info: [Info],
    loader: [CircleNotch],
    "refresh-cw": [ArrowsClockwise],
    "rotate-cw": [ArrowClockwise],
    "rotate-ccw": [ArrowCounterClockwise],
    "wifi-off": [WifiSlash],

    /* places and people */
    home: [House],
    "map-pin": [MapPin],
    map: [MapTrifold],
    navigation: [NavigationArrow],
    globe: [Globe],
    user: [User],
    "user-check": [UserCheck],
    users: [Users],
    phone: [Phone],
    headphones: [Headphones],
    "message-square": [ChatCentered],
    bell: [Bell],

    /* things the app keeps */
    bookmark: [BookmarkSimple],
    "bookmark-fill": [BookmarkSimple, "fill"],
    calendar: [CalendarBlank],
    clock: [Clock],
    "edit-2": [PencilSimple],
    "edit-3": [PaintBrush],
    "file-text": [FileText],
    grid: [SquaresFour, "fill"],
    "grid-line": [SquaresFour],
    image: [Image],
    list: [ListChecks],
    inbox: [Tray],
    briefcase: [Briefcase],
    clipboard: [Clipboard],
    camera: [Camera],
    download: [DownloadSimple],
    search: [MagnifyingGlass],
    sliders: [SlidersHorizontal],
    star: [Star, "fill"],

    /* money, safety and the small print */
    shield: [ShieldCheck],
    key: [Key],
    lock: [Lock],
    tag: [Tag],
    "help-circle": [Question],
    "log-out": [SignOut],
    "trash-2": [Trash],
    plus: [Plus],
    minus: [Minus],
    settings: [Gear],

    /* the trades */
    tool: [Wrench],
    wind: [Wind],
    zap: [Lightning],
    droplet: [Drop],
    feather: [Feather],
    filter: [Funnel],
    thermometer: [Thermometer],
    square: [Square],
    hammer: [Hammer],
    bug: [Bug],
    drop: [Drop],

    /* the tab bar, which is named after where it goes */
    index: [House, "fill"],
    services: [Wrench],
    jobs: [CalendarBlank],
    account: [User],
    ask: [ChatCircleDots],
    "bike-fast": [NavigationArrow, "fill"],
};

/**
 * A name nobody has drawn yet falls back to the tool rather than to nothing.
 * A missing icon leaves a hole in a row that is laid out around it, and a hole
 * is harder to spot in testing than a wrong-but-present mark.
 *
 * `weight` can be overridden per use - a row that wants a solid star where the
 * map says outline passes it - but the default comes from the table, so the
 * app stays consistent without every call site repeating itself.
 */
export const Icon = ({ name, size = 20, color = "#000", weight, style }) => {
    const [Mark, solid] = MARKS[name] || MARKS.tool;
    return <Mark size={size} color={color} weight={weight || solid || "regular"} style={style} />;
};

export default Icon;
