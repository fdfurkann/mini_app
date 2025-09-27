<?php 

//ini_set("display_errors",1);
//error_reporting(E_ALL);

$config = file_get_contents("live_rates.py");



preg_match("/mysql_host = \"(.*?)\"/i",$config,$m1);
preg_match("/mysql_user = \"(.*?)\"/i",$config,$m2);
preg_match("/mysql_pass = \"(.*?)\"/i",$config,$m3);
preg_match("/mysql_name = \"(.*?)\"/i",$config,$m4);
preg_match("/kanal_tam_adi = \"(.*?)\"/i",$config,$m5);

$mysql_host = $m1[1];
$mysql_user = $m2[1];
$mysql_pass = $m3[1];
$mysql_name = $m4[1];
$kanal_adi = $m5[1];


mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$mysqli = new mysqli($mysql_host, $mysql_user, $mysql_pass, $mysql_name);

$q = $mysqli->query("set names utf8;");



?><h1>Live Rates</h1>
<style>

* { font-family:Tahoma; }
a { color:red; }
table, th, td {
	white-space:nowrap;
  font-size:10pt;
  border: 1px solid black;
  border-collapse: collapse;
  padding:2px;
}

.info { border:1px solid blue;padding:10px;margin-bottom:10px; }

</style>

<table border=1 width="100%" margin=0 padding=0>
<tr><td>sira</td><td>symbol</td><td>price</td><td>date</td><td>digits</td><td>vdigits</td></tr>
<?		

$q = $mysqli->query("select * from rates where 1 order by symbol asc;");
$say=1;
while($z=$q->fetch_assoc()) {
	?>
	<tr><td><?=$say;?></td><td><?=$z['symbol'];?></td><td><?=$z['price']?></td><td><?=$z['dates']?></td><td><?=$z['digits']?></td><td><?=$z['vdigits']?></td></tr>
	<?
	$say++;
	}
	
?>
</table> 