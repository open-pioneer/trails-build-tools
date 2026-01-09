import { sourceId } from "open-pioneer:source-info";
import { logSourceId as logSourceId1 } from "./log";
import { logSourceId as logSourceId2 } from "./dir/log";

export function Component() {
    logSourceId1();
    logSourceId2();
    return <div>sourceId: {sourceId}</div>
}
