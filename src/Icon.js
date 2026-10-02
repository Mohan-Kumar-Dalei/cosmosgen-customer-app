import ArrowLeftLine from "react-native-remix-icon/src/icons/ArrowLeftLine";
import ArrowRightLine from "react-native-remix-icon/src/icons/ArrowRightLine";
import ArrowUpLine from "react-native-remix-icon/src/icons/ArrowUpLine";
import ArrowRightUpLine from "react-native-remix-icon/src/icons/ArrowRightUpLine";
import CornerDownRightLine from "react-native-remix-icon/src/icons/CornerDownRightLine";

import Notification3Line from "react-native-remix-icon/src/icons/Notification3Line";
import BookmarkLine from "react-native-remix-icon/src/icons/BookmarkLine";
import BookmarkFill from "react-native-remix-icon/src/icons/BookmarkFill";
import CalendarLine from "react-native-remix-icon/src/icons/CalendarLine";
import CheckLine from "react-native-remix-icon/src/icons/CheckLine";
import CheckboxCircleLine from "react-native-remix-icon/src/icons/CheckboxCircleLine";
import CloseLine from "react-native-remix-icon/src/icons/CloseLine";
import CloseCircleLine from "react-native-remix-icon/src/icons/CloseCircleLine";
import ArrowDownSLine from "react-native-remix-icon/src/icons/ArrowDownSLine";
import ArrowUpSLine from "react-native-remix-icon/src/icons/ArrowUpSLine";
import ArrowRightSLine from "react-native-remix-icon/src/icons/ArrowRightSLine";
import ArrowLeftSLine from "react-native-remix-icon/src/icons/ArrowLeftSLine";
import TimeLine from "react-native-remix-icon/src/icons/TimeLine";
import EditLine from "react-native-remix-icon/src/icons/EditLine";
import FileTextLine from "react-native-remix-icon/src/icons/FileTextLine";
import GlobalLine from "react-native-remix-icon/src/icons/GlobalLine";
import GridFill from "react-native-remix-icon/src/icons/GridFill";
import GridLine from "react-native-remix-icon/src/icons/GridLine";
import HomeLine from "react-native-remix-icon/src/icons/HomeLine";
import HomeFill from "react-native-remix-icon/src/icons/HomeFill";
import InformationLine from "react-native-remix-icon/src/icons/InformationLine";
import LogoutBoxRLine from "react-native-remix-icon/src/icons/LogoutBoxRLine";
import MapLine from "react-native-remix-icon/src/icons/MapLine";
import MapPin2Line from "react-native-remix-icon/src/icons/MapPin2Line";
import PhoneLine from "react-native-remix-icon/src/icons/PhoneLine";
import AddLine from "react-native-remix-icon/src/icons/AddLine";
import SubtractLine from "react-native-remix-icon/src/icons/SubtractLine";
import SearchLine from "react-native-remix-icon/src/icons/SearchLine";
import ShieldCheckLine from "react-native-remix-icon/src/icons/ShieldCheckLine";
import Equalizer2Line from "react-native-remix-icon/src/icons/Equalizer2Line";
import StarFill from "react-native-remix-icon/src/icons/StarFill";
import ToolsLine from "react-native-remix-icon/src/icons/ToolsLine";
import DeleteBinLine from "react-native-remix-icon/src/icons/DeleteBinLine";
import UserLine from "react-native-remix-icon/src/icons/UserLine";
import UserFollowLine from "react-native-remix-icon/src/icons/UserFollowLine";
import WifiOffLine from "react-native-remix-icon/src/icons/WifiOffLine";
import GroupLine from "react-native-remix-icon/src/icons/GroupLine";
import Chat3Line from "react-native-remix-icon/src/icons/Chat3Line";
import KeyLine from "react-native-remix-icon/src/icons/KeyLine";
import ImageLine from "react-native-remix-icon/src/icons/ImageLine";
import ListCheck from "react-native-remix-icon/src/icons/ListCheck";
import InboxLine from "react-native-remix-icon/src/icons/InboxLine";
import BriefcaseLine from "react-native-remix-icon/src/icons/BriefcaseLine";
import NavigationLine from "react-native-remix-icon/src/icons/NavigationLine";
import Loader4Line from "react-native-remix-icon/src/icons/Loader4Line";
import CheckboxBlankCircleLine from "react-native-remix-icon/src/icons/CheckboxBlankCircleLine";
import ForbidLine from "react-native-remix-icon/src/icons/ForbidLine";
import CustomerService2Line from "react-native-remix-icon/src/icons/CustomerService2Line";
import QuestionLine from "react-native-remix-icon/src/icons/QuestionLine";
import LockLine from "react-native-remix-icon/src/icons/LockLine";
import PriceTag3Line from "react-native-remix-icon/src/icons/PriceTag3Line";
import ClipboardLine from "react-native-remix-icon/src/icons/ClipboardLine";
import RefreshLine from "react-native-remix-icon/src/icons/RefreshLine";
import CameraLine from "react-native-remix-icon/src/icons/CameraLine";
import ErrorWarningLine from "react-native-remix-icon/src/icons/ErrorWarningLine";
import DownloadLine from "react-native-remix-icon/src/icons/DownloadLine";
import Settings3Line from "react-native-remix-icon/src/icons/Settings3Line";

/* ---- the trades, which need marks of their own ---- */
import TempColdLine from "react-native-remix-icon/src/icons/TempColdLine";
import FlashlightLine from "react-native-remix-icon/src/icons/FlashlightLine";
import WaterFlashLine from "react-native-remix-icon/src/icons/WaterFlashLine";
import Brush2Line from "react-native-remix-icon/src/icons/Brush2Line";
import PaintBrushLine from "react-native-remix-icon/src/icons/PaintBrushLine";
import BugLine from "react-native-remix-icon/src/icons/BugLine";
import HammerLine from "react-native-remix-icon/src/icons/HammerLine";
import FridgeLine from "react-native-remix-icon/src/icons/FridgeLine";
// Remix has no washing machine. A shirt is what the machine is for, which
// is the nearest honest mark - and the word under the tile does the naming.
import ShirtLine from "react-native-remix-icon/src/icons/ShirtLine";
import Restaurant2Line from "react-native-remix-icon/src/icons/Restaurant2Line";
import DropLine from "react-native-remix-icon/src/icons/DropLine";
import FilterLine from "react-native-remix-icon/src/icons/FilterLine";

/**
 * Every mark in the app, from Remix Icon.
 *
 * Mohan asked for these rather than pictures: an icon should be a vector that
 * takes the colour it is given and stays crisp at any size, not a PNG somebody
 * has to redraw for a new palette. Remix is the set he named.
 *
 * Imported one file at a time rather than from the package's own index. That
 * index does `import * as Icon from "./icons"`, which pulls all three thousand
 * of them into the bundle - a few megabytes of SVG for the forty this app
 * actually draws, on handsets the product exists to keep working on. Naming
 * them here costs a line each and bundles exactly what is used.
 *
 * The keys are the names the app already had, from the set it used before.
 * That was deliberate: it let every call site keep the name it was passing, so
 * swapping the whole app over was a change of component rather than a rewrite
 * of thirty screens. New code should use the plain names below rather than
 * hunting for a Feather spelling.
 */
const MARKS = {
    /* movement */
    "arrow-left": ArrowLeftLine,
    "arrow-right": ArrowRightLine,
    "arrow-up": ArrowUpLine,
    "arrow-up-right": ArrowRightUpLine,
    "corner-down-right": CornerDownRightLine,
    "chevron-down": ArrowDownSLine,
    "chevron-up": ArrowUpSLine,
    "chevron-right": ArrowRightSLine,
    "chevron-left": ArrowLeftSLine,

    /* state */
    check: CheckLine,
    "check-circle": CheckboxCircleLine,
    circle: CheckboxBlankCircleLine,
    x: CloseLine,
    "x-circle": CloseCircleLine,
    slash: ForbidLine,
    "alert-circle": ErrorWarningLine,
    info: InformationLine,
    loader: Loader4Line,
    "refresh-cw": RefreshLine,
    "wifi-off": WifiOffLine,

    /* places and people */
    home: HomeLine,
    "map-pin": MapPin2Line,
    map: MapLine,
    navigation: NavigationLine,
    globe: GlobalLine,
    user: UserLine,
    "user-check": UserFollowLine,
    users: GroupLine,
    phone: PhoneLine,
    headphones: CustomerService2Line,
    "message-square": Chat3Line,

    /* things on screen */
    bell: Notification3Line,
    bookmark: BookmarkLine,
    "bookmark-fill": BookmarkFill,
    calendar: CalendarLine,
    clock: TimeLine,
    "edit-2": EditLine,
    "edit-3": PaintBrushLine,
    "file-text": FileTextLine,
    grid: GridFill,

    // The outline weight, for the tab bar - the filled grid beside a
    // line house and a line calendar reads as the one that is already
    // selected.
    "grid-line": GridLine,
    image: ImageLine,
    list: ListCheck,
    inbox: InboxLine,
    briefcase: BriefcaseLine,
    clipboard: ClipboardLine,
    camera: CameraLine,
    download: DownloadLine,
    search: SearchLine,
    sliders: Equalizer2Line,
    star: StarFill,
    shield: ShieldCheckLine,
    key: KeyLine,
    lock: LockLine,
    tag: PriceTag3Line,
    "help-circle": QuestionLine,
    "log-out": LogoutBoxRLine,
    "trash-2": DeleteBinLine,
    plus: AddLine,
    minus: SubtractLine,
    settings: Settings3Line,

    /* the trades */
    tool: ToolsLine,
    wind: TempColdLine,
    zap: FlashlightLine,
    droplet: WaterFlashLine,
    feather: Brush2Line,
    filter: FilterLine,
    thermometer: FridgeLine,
    "rotate-cw": ShirtLine,
    square: Restaurant2Line,
    hammer: HammerLine,
    bug: BugLine,
    drop: DropLine,

    /* the nav bar, which names its own */
    index: HomeFill,
    services: ToolsLine,
    jobs: CalendarLine,
    account: UserLine,
    ask: Chat3Line,
    "bike-fast": NavigationLine,
};

/**
 * `<Icon name="map-pin" size={18} color={colors.ink} />`
 *
 * A name nobody has drawn yet falls back to the tool rather than to nothing.
 * A missing icon leaves a hole in a row that is laid out around it, and a hole
 * is harder to spot in testing than a wrong-but-present mark.
 */
export const Icon = ({ name, size = 20, color = "#000", style }) => {
    const Mark = MARKS[name] || MARKS.tool;
    return <Mark width={size} height={size} fill={color} style={style} />;
};

export default Icon;
