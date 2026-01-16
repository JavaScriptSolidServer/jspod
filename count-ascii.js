#!/usr/bin/env node

// Count from user's screenshot
const lines = [
  '                        ██╗███████╗███████╗██████╗                    ',
  '                        ██║██╔════╝██╔════╝██╔══██╗                   ',
  '                        ██║███████╗███████╗██║  ██║                   ',
  '                   ██   ██║╚════██║╚════██║██║  ██║                   ',
  '                   ╚█████╔╝███████║███████║██████╔╝                   ',
  '                    ╚════╝ ╚══════╝╚══════╝╚═════╝                    ',
];

console.log('Current line lengths:\n');
lines.forEach((line, i) => {
  console.log(`Row ${i + 3}: ${line.length} chars`);
});

// Measure the ASCII content itself
const asciiLines = [
  '     ██╗███████╗███████╗██████╗ ',
  '     ██║██╔════╝██╔════╝██╔══██╗',
  '     ██║███████╗███████╗██║  ██║',
  '██   ██║╚════██║╚════██║██║  ██║',
  '╚█████╔╝███████║███████║██████╔╝',
  ' ╚════╝ ╚══════╝╚══════╝╚═════╝ ',
];

console.log('\nASCII content lengths:\n');
asciiLines.forEach((line, i) => {
  console.log(`Line ${i + 1}: "${line}" = ${line.length} chars`);
});
