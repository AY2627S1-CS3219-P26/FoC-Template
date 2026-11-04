output "region" {
  value = var.region
}

output "instance_id" {
  value = aws_instance.relay.id
}

output "public_ip" {
  value = aws_eip.relay.public_ip
}

output "hostname" {
  value = local.hostname
}

output "ssh" {
  value = "ssh -i ~/.ssh/relay-aws ubuntu@${aws_eip.relay.public_ip}"
}
