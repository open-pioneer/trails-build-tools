// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import generateModule from "@babel/generator";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generate = ((generateModule as any).default ||
    generateModule) as typeof generateModule;

import templateModule from "@babel/template";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const template = ((templateModule as any).default ||
    templateModule) as typeof templateModule;

import nodesModule from "@babel/types";
import type * as NodesModule from "@babel/types";
export type * as Nodes from "@babel/types";
export const nodes = nodesModule as typeof NodesModule;
