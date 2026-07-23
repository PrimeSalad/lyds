import { describe, expect, it } from 'vitest';
import { getPaginationItems } from './Pagination';

describe('getPaginationItems', () => {
  it('shows every page for short result sets', () => {
    expect(getPaginationItems(3, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('shows the start, nearby pages, and the last page', () => {
    expect(getPaginationItems(2, 20)).toEqual([1, 2, 3, 4, 'ellipsis-end', 20]);
  });

  it('shows both ellipses around a middle page', () => {
    expect(getPaginationItems(10, 20)).toEqual([
      1,
      'ellipsis-start',
      9,
      10,
      11,
      'ellipsis-end',
      20,
    ]);
  });

  it('shows the first page and the end of the range', () => {
    expect(getPaginationItems(19, 20)).toEqual([
      1,
      'ellipsis-start',
      17,
      18,
      19,
      20,
    ]);
  });
});
