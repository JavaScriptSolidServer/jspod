#!/usr/bin/env node

// Generate jspod ASCII art with proper spacing

const asciiLines = [
  '     ██╗███████╗██████╗  ██████╗ ██████╗ ',
  '     ██║██╔════╝██╔══██╗██╔═══██╗██╔══██╗',
  '     ██║███████╗██████╔╝██║   ██║██║  ██║',
  '██   ██║╚════██║██╔═══╝ ██║   ██║██║  ██║',
  '╚█████╔╝███████║██║     ╚██████╔╝██████╔╝',
  ' ╚════╝ ╚══════╝╚═╝      ╚═════╝ ╚═════╝ ',
];

console.log('ASCII art content lengths:\n');
asciiLines.forEach((line, i) => {
  console.log(`Row ${i + 1}: ${line.length} chars | "${line}"`);
});

// Calculate spacing for 67-char total
const targetLength = 67;
console.log('\nSpacing calculation:');
asciiLines.forEach((line, i) => {
  const contentLength = line.length;
  const spacesNeeded = targetLength - contentLength;
  const leftSpaces = Math.floor(spacesNeeded / 2);
  const rightSpaces = spacesNeeded - leftSpaces;

  console.log(`Row ${i + 1}: ${leftSpaces} left + ${contentLength} content + ${rightSpaces} right = ${leftSpaces + contentLength + rightSpaces}`);
});

// Generate the properly spaced lines
console.log('\nProperly formatted banner lines:\n');
asciiLines.forEach((line, i) => {
  const contentLength = line.length;
  const spacesNeeded = targetLength - contentLength;
  const leftSpaces = Math.floor(spacesNeeded / 2);
  const rightSpaces = spacesNeeded - leftSpaces;

  const formatted = ' '.repeat(leftSpaces) + line + ' '.repeat(rightSpaces);
  console.log(`Line ${i + 1}: "${formatted}" (${formatted.length} chars)`);
});
