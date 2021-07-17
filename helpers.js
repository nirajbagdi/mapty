const allNumbers = (...inputs) => inputs.every(inp => Number.isFinite(inp));

const allPositive = (...inputs) => inputs.every(inp => inp > 0);

const capitalize = str =>
    str.toLowerCase().replace(str[0], str[0].toUpperCase());
