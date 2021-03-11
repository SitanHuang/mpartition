$(function() {
  $("#dialog-create-disk").dialog({
    resizable: false,
    height: "auto",
    width: 400,
    modal: true,
    buttons: {
      Cancel: function() {
        $(this).dialog("close");
      },
      "Create Disk": function() {
        if ($('#dialog-create-disk input').val().length && parseFloat($('#dialog-create-disk input').val()) >= 100) {
          dsk_create(parseFloat($('#dialog-create-disk input').val()));
          update_ui();
          $(this).dialog("close");
        }
      }
    }
  }).dialog("close");
});

function format_size(s) {
  return  (Math.round(s * 1) / 1)
}

function add_disk() {
  $("#dialog-create-disk").dialog("open").find("input").val("1000");
}

function add_partition(part) {
  if (window.eventCalled) return;
  window.eventCalled = true;
  let title;
  if (title = prompt('Add partition')) {
    partition_create(part, {label: title});
    disks.forEach(x => size_partition(x));
    update_ui();
  }
  setTimeout(()=>{window.eventCalled = false;},100);
}

function exportToJsonFile(obj) {
  let dataStr = JSON.stringify(obj);
  let dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  let exportFileDefaultName = 'data.json';

  let linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function reload_disk_panel(disk, i) {
  let _d = i == -1 ? '_selectedPartition' : `disks[${i}]`;
  let html = `<disk>
  <h3 style="margin: 0">
    ${i == -1 ? "<button onclick=\"_selectedPartition=null;update_ui()\">X</button>" : ""}
    <input value="${disk.label}" onchange="${_d}.label=this.value.trim();update_ui()">
    ${disk.size} total
  </h3><br>
  <table class="partition root"><tr>`;

  html += graph_partition(disk);
  if (disk.unallocated > 0.1) {
    let title = `Unallocated (${Math.round(disk.unallocated / disk.size * 10000)/100}%, ${format_size(disk.unallocated)})`;
    html += `<td class="partition" style="width: ${disk.unallocated / disk.size * 100}%">
    <table class="partition unallocated" onclick="add_partition(${i == -1 ? `window._selectedPartition` : `disks[${i}]`})" title="${title}"><tr><td>
    <span>${title}</span>
    </td></tr></table>
    </td>`;
  }

  html += `</tr></table><br><br>
  <textarea>
  {
    fixed: ${disk.fixed},
    minFixed: ${disk.minFixed},
    maxFixed: ${disk.maxFixed},
    absolutePerc: ${disk.absolutePerc},
    minAbsolutePerc: ${disk.minAbsolutePerc},
    maxAbsolutePerc: ${disk.maxAbsolutePerc},
    ${i != -1 ? "size: "+disk.size : ""}
  }
  </textarea> <button onclick="update_metadata(${_d}, this)">Update metadata</button>
  ${i != -1 ? `<button onclick="disks.splice(${i}, 1);update_ui()">Remove disk</button>` : ''}
  <button onclick="disks.push(JSON.parse(JSON.stringify(${_d})));update_ui()">Duplicate disk</button>
  <button onclick="add_partition(${i == -1 ? `window._selectedPartition` : `disks[${i}]`})">Add partition</button>
  </disk>`;
  return html;
}

function update_metadata(p, btn) {
  Object.assign(p, eval(`(${$(btn).parent().find('textarea').val()})`));
  disks.forEach(x => size_partition(x));
  update_ui();
}

function partition_onclick(that, p) {
   if (window.eventCalled) return;
   window.eventCalled = true;
   if (disks.indexOf(p) >= 0) _selectedPartition = null;
   else _selectedPartition = p;
   update_ui();
   setTimeout(()=>{window.eventCalled = false;},100);
}
function partition_delete(parent, p) {
   if (window.eventCalled) return;
   window.eventCalled = true;
   if (confirm('Delete ' + p.label + ' from ' + parent.label + "?")) {
     parent.partitions = parent.partitions.filter(x => x != p);
     _selectedPartition = null;
     disks.forEach(x => size_partition(x));
     update_ui();
   }
   setTimeout(()=>{window.eventCalled = false;},100);
}

function graph_partition(part) {
  let html = '';
  part.partitions.forEach(p => {
    partitionsDrew.push(part);
    partitionsDrew.push(p);
    let title = `${p.label} (${Math.round(p.size / part.size * 10000)/100}%, ${format_size(p.size)})`;
    html += `<td
      oncontextmenu="partition_delete(partitionsDrew[${partitionsDrew.length - 2}], partitionsDrew[${partitionsDrew.length - 1}]); return false;"
      onclick="partition_onclick(this, partitionsDrew[${partitionsDrew.length - 1}])"
      style="width: ${p.size / part.size * 100}%;">
      <table class="partition" style="background: ${p.color}" title="${title}"><tr>`;
    html += graph_partition(p);
    if (p.unallocated > 0.1 && p.partitions.length) {
      let title = `Unallocated (${Math.round(p.unallocated / p.size * 10000)/100}%, ${format_size(p.unallocated)})`;
      html += `<td class="partition" style="width: ${p.unallocated / p.size * 100}%">
      <table class="partition unallocated" onclick="add_partition(partitionsDrew[${partitionsDrew.length - 1}])" title="${title}"><tr><td>
      <span>${title}</span>
      </td></tr></table>
      </td>`;
    }
    if (!p.partitions.length) html += `<td><span>${title}</span></td>`;
    else html += `</tr><tr><td colspan=${p.partitions.length}><span>${title}</span></td>`
    html += '</tr></table></td>';
  });
  return html;
}

let partitionsDrew = [];
function update_ui() {
  partitionsDrew = [];
  let $disks = $('disks').html('');
  disks.forEach((disk, i) => {
    $disks.append(reload_disk_panel(disk, i));
  });
  if (window._selectedPartition) {
    $disks.append(reload_disk_panel(_selectedPartition, -1));
  }
}

window._selectedPartition = null;

dsk_create(66000 / 12);
partition_create(disks[0], {label: 'Necessities', fixed: 400, minAbsolutePerc: 10});update_ui();
partition_create(disks[0], {label: 'Leisure'});update_ui();
partition_create(disks[0], {label: 'Savings', maxAbsolutePerc: 30, minFixed: 1000});update_ui();
partition_create(disks[0].partitions[2], {label: 'EMG'});update_ui();
partition_create(disks[0].partitions[2], {label: 'Med'});update_ui();
