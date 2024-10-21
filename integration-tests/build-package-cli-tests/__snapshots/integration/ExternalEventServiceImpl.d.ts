import { ApplicationContext, Service, ServiceOptions } from "@open-pioneer/runtime";
import { ExternalEventService } from "./api";
interface References {
    ctx: ApplicationContext;
}
export declare class ExternalEventServiceImpl implements Service<ExternalEventService> {
    #private;
    constructor({ references }: ServiceOptions<References>);
    emitEvent(name: string, detail?: unknown): void;
    emitEvent(event: Event): void;
}
export {};
