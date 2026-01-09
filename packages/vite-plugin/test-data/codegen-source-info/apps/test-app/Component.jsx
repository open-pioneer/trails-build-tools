import { Component as Component1 } from "../../packages/package1/Component";
import { sourceId } from "open-pioneer:source-info";

export function Component() {
    return (
        <div>
            sourceId: {sourceId}
            <Component1></Component1>
        </div>
    );
}
