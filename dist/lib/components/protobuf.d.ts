/// <reference types="node" />
import { Protobuf } from 'pinus-protobuf';
import { Application } from '../application';
import { IComponent } from '../interfaces/Component';
export declare class ProtobufComponent implements IComponent {
    app: Application;
    watchers: {};
    serverProtos: {};
    clientProtos: {};
    version: string;
    serverProtosPath: string;
    clientProtosPath: string;
    protobuf: Protobuf;
    name: string;
    constructor(app: any, opts: any);
    encode(key: any, msg: any): Buffer;
    encode2Bytes(key: any, msg: any): Uint8Array;
    decode(key: any, msg: any): any;
    getProtos(): {
        server: {};
        client: {};
        version: string;
    };
    getVersion(): string;
    setProtos(type: any, path: any): void;
    onUpdate(type: any, path: any, event: any): void;
    stop(force: any, cb: any): void;
}
