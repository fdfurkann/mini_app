  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" className="h-8 w-8 p-0">
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => handleEdit(member.id)}>Düzenle</DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleDelete(member.id)} className="text-red-600">Sil</DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/admin/member/${member.id}/manage`)}>Yönet</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu> 