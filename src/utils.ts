const BAD_CHARS = `!"#$%&'()*+,./:;<=>?@[\]^\`{|}~`;

export function stringToSafePath(value: string): string {
    value = value.replaceAll(" ", "_").toLowerCase();

    for (let i = 0; i < BAD_CHARS.length; i++) {
        value = value.replaceAll(BAD_CHARS.charAt(i), "");
    }

    return value;
}
