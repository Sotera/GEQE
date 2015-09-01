INFILE = 'polyGunClev.txt'
OUTFILE = 'polyGun.kml'
NAME = 'Cleveland Gun Ranges'
Description = 'Gun Ranges around Cleveland'
COLOR='Red'

fout = open(OUTFILE, 'w')
fin = open('kmlheader.txt', 'r')

for line in fin:
    fout.write(line)
fin.close()

hash_poly = {}
fin = open(INFILE, 'r')
for line in fin:
    (polygon, latitude, longitude) = line.strip().split(',')
    if polygon not in hash_poly:
        hash_poly[polygon] = []
    hash_poly[polygon].append(longitude + ',' + latitude + ',' + polygon)

fin.close()


fout.write('\t<Folder>\n')

counter = 0
for ky in hash_poly:
    fout.write('\t\t<Placemark>\n')
    counter += 1
    fout.write('\t\t\t<name>' + INFILE + '-' + str(counter) + '</name>\n')
    fout.write('\t\t\t<styleUrl>#trans' + COLOR + 'Poly</styleUrl>\n')
    fout.write('\t\t\t<Polygon>\n')
    fout.write('\t\t\t\t<extrude>1</extrude>\n')
    fout.write('\t\t\t\t<altitudeMode>relativeToGround</altitudeMode>\n')
    fout.write('\t\t\t\t<outerBoundaryIs>\n')
    fout.write('\t\t\t\t\t<LinearRing>\n')
    fout.write('\t\t\t\t\t\t<coordinates>\n')
    for lne in hash_poly[ky]:
        fout.write('\t\t\t\t\t\t' + lne + '\n')
    #Write the first line over again
    fout.write('\t\t\t\t\t\t' + hash_poly[ky][0] + '\n')
    fout.write('\t\t\t\t\t\t</coordinates>\n')
    fout.write('\t\t\t\t\t</LinearRing>\n')
    fout.write('\t\t\t\t</outerBoundaryIs>\n')
    fout.write('\t\t\t</Polygon>\n')
    fout.write('\t\t</Placemark>\n')
fout.write('\t</Folder>\n')
fout.write('</Document>\n')
fout.write('</kml>\n')




fout.close()
