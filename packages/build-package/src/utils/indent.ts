// SPDX-FileCopyrightText: con terra GmbH and contributors
// SPDX-License-Identifier: Apache-2.0

export function indent(str: string, indent: string) {
    const pattern = /^(?!\s*$)/gm;
    return str.replace(pattern, indent);
}
