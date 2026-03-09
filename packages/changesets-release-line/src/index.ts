// SPDX-FileCopyrightText: 2023-2025 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0

import {
    NewChangesetWithCommit,
    VersionType,
    ChangelogFunctions,
    ModCompWithPackage
} from "@changesets/types";

const getReleaseLine = async (changeset: NewChangesetWithCommit, _type: VersionType) => {
    const [firstLine, ...futureLines] = changeset.summary.split("\n").map((l) => l.trimEnd());

    let returnVal = `- ${changeset.commit ? `${changeset.commit.slice(0, 7)}: ` : ""}${firstLine}`;

    if (futureLines.length > 0) {
        returnVal += `\n${futureLines.map((l) => `  ${l}`).join("\n")}`;
    }

    return returnVal;
};

const getDependencyReleaseLine = async (
    _changesets: NewChangesetWithCommit[],
    _dependenciesUpdated: ModCompWithPackage[]
) => {
    //do not log internal dependency updates to changelogs
    return "";
};

const changelogFunctions: ChangelogFunctions = {
    getReleaseLine,
    getDependencyReleaseLine
};

export default changelogFunctions;
