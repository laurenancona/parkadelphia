var tpl = document.getElementById('sidebar-tpl').innerHTML;
var output = Mustache.render(tpl, data);
document.getElementById('stats').innerHTML = output;
console.log(data.rows);


{{#rows}}
  {{reg_id}}
    {{fromDay}}-{{toDay}}
    {{fromHour}}-{{toHour}}
    {{rate}} | {{limit}}
{{/rows}}