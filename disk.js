let disks = [];

function dsk_create(size) {
  let part = partition_create(null, {size: size, label: "Disk " + disks.length});
  disks.push(part);
}

function partition_create(parent, props) {
  let part = {
    fixed: null, // ex. fixed $500 expenditure
    minFixed: null,
    maxFixed: null,
    absolutePerc: null, // ex. a saving fund will always take 10% from income
    minAbsolutePerc: null,
    maxAbsolutePerc: null,
    partitions: [],
    unallocated: 0,
    size: 0,
    label: 'Unnamed partition',
    color: randomColor({luminosity: 'light'})
  };

  // if (!props || (isNaN(props.fixed) && isNaN(props.absolutePerc))) {
  //   part.fixed = parent.unallocated;
  // }

  Object.assign(part, props);
  size_partition(part);

  if (!parent) return part;
  parent.partitions.push(part);
  size_partition(parent);
  return part;
}

async function loadFile(file) {
  let text = await file.text();
  disks = JSON.parse(text);
  update_ui();
}

function size_not_enough(disk, alloc) {
  let delta = alloc - disk.unallocated;
  if (confirm(`Not enough space. Raise ${disk.label} from ${format_size(disk.size)} to ${format_size(disk.size + delta)}?`)) {

    disk.unallocated += delta;
    disk.size += delta;

    disk.unallocated = Math.round(disk.unallocated * 100) / 100;
    disk.size = Math.round(disk.size * 100) / 100;
  } else {
    throw 'Not enough space.';
  }
}

function size_partition(disk) {
  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    part.size = 0;
  }
  disk.unallocated = disk.size;
  /*
  Order:
  - fixed
  - absolute perc
  - rest is divided
  */
  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    if (!part.fixed || part.size) continue;

    let max = Math.min(part.maxFixed || Infinity, (part.maxAbsolutePerc || Infinity) * disk.size / 100);
    let min = Math.max(part.minFixed || 0, (part.minAbsolutePerc || 0) * disk.size / 100);

    part.size = disk.unallocated;
    let calc = Math.round(Math.min(max, Math.max(min, part.fixed))  * 100) / 100;
    if (calc > disk.unallocated) size_not_enough(disk, calc);

    part.size = calc;
    disk.unallocated -= part.size;
  }
  disk.unallocated = Math.round(disk.unallocated * 100) / 100;
  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    if (!part.absolutePerc || part.size) continue;

    let max = Math.min(part.maxFixed || Infinity, (part.maxAbsolutePerc || Infinity) * disk.size / 100);
    let min = Math.max(part.minFixed || 0, (part.minAbsolutePerc || 0) * disk.size / 100);

    part.size = disk.unallocated;
    let calcSize = Math.round(Math.min(max, Math.max(min, disk.size * part.absolutePerc / 100))  * 100) / 100;
    if (calcSize > disk.unallocated) size_not_enough(disk, calcSize);

    part.size = calcSize;
    disk.unallocated -= part.size;
  }
  disk.unallocated = Math.round(disk.unallocated * 100) / 100;

  let remainingUnallocated = disk.unallocated;
  let leftOverParts = 0;

  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    if (!part.size) leftOverParts++;
  }
  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    if (part.size) continue;

    let max = Math.min(part.maxFixed || Infinity, (part.maxAbsolutePerc || Infinity) * disk.size / 100);
    let min = Math.max(part.minFixed || 0, (part.minAbsolutePerc || 0) * disk.size / 100);

    part.size = disk.unallocated;
    let calcSize = Math.round(Math.min(max, Math.max(min, remainingUnallocated / leftOverParts))  * 100) / 100;
    if (calcSize > disk.unallocated) size_not_enough(disk, calcSize);

    part.size = calcSize;
    disk.unallocated -= part.size;
  }
  remainingUnallocated = disk.unallocated;
  leftOverParts = 0;

  for (let i = 0;i < disk.partitions.length;i++) {
    let part = disk.partitions[i];
    if (!part.absolutePerc && !part.fixed && !(part.maxFixed || part.maxAbsolutePerc)) leftOverParts++;
  }
  for (let i = 0;i < disk.partitions.length && leftOverParts && remainingUnallocated;i++) {
    let part = disk.partitions[i];
    if (part.absolutePerc || part.fixed || part.maxFixed || part.maxAbsolutePerc) continue;

    let min = Math.max(part.minFixed || 0, (part.minAbsolutePerc || 0) * disk.size / 100);

    let calcSize = Math.round(Math.max(min, part.size + remainingUnallocated / leftOverParts)  * 100) / 100;

    part.size = calcSize;
    disk.unallocated -= part.size;
  }

  disk.partitions.forEach(part => {
    size_partition(part);
  });
}
